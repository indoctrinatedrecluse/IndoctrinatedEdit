param (
    [Parameter(Mandatory=$true)]
    [string]$CommandLine,
    
    [Parameter(Mandatory=$false)]
    [string]$CurrentDirectory = "",
    
    [Parameter(Mandatory=$false)]
    [int]$Cols = 120,
    
    [Parameter(Mandatory=$false)]
    [int]$Rows = 30
)

$conptySource = @'
using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public static class ConPtyRunner
{
    [StructLayout(LayoutKind.Sequential)]
    public struct COORD { public short X; public short Y; }

    [StructLayout(LayoutKind.Sequential)]
    public struct STARTUPINFOEX
    {
        public STARTUPINFO StartupInfo;
        public IntPtr lpAttributeList;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct STARTUPINFO
    {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION
    {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern int CreatePseudoConsole(COORD size, IntPtr hInput, IntPtr hOutput, uint dwFlags, out IntPtr phPC);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern int ClosePseudoConsole(IntPtr hPC);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CreatePipe(out IntPtr hReadPipe, out IntPtr hWritePipe, IntPtr lpPipeAttributes, uint nSize);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool InitializeProcThreadAttributeList(IntPtr lpAttributeList, int dwAttributeCount, int dwFlags, ref IntPtr lpSize);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool UpdateProcThreadAttribute(IntPtr lpAttributeList, uint dwFlags, IntPtr Attribute, IntPtr lpValue, IntPtr cbSize, IntPtr lpPreviousValue, IntPtr lpReturnSize);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CreateProcess(string lpApplicationName, string lpCommandLine, IntPtr lpProcessAttributes, IntPtr lpThreadAttributes, bool bInheritHandles, uint dwCreationFlags, IntPtr lpEnvironment, string lpCurrentDirectory, ref STARTUPINFOEX lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetExitCodeProcess(IntPtr hProcess, out uint lpExitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    public const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
    public static readonly IntPtr PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE = (IntPtr)0x00020016;

    public static int Run(string commandLine, string currentDirectory, short cols, short rows)
    {
        IntPtr hInRead, hInWrite, hOutRead, hOutWrite;
        CreatePipe(out hInRead, out hInWrite, IntPtr.Zero, 0);
        CreatePipe(out hOutRead, out hOutWrite, IntPtr.Zero, 0);

        COORD size = new COORD { X = cols, Y = rows };
        IntPtr hPC;
        int hr = CreatePseudoConsole(size, hInRead, hOutWrite, 0, out hPC);
        if (hr != 0) return 1;

        CloseHandle(hInRead);
        CloseHandle(hOutWrite);

        IntPtr lpSize = IntPtr.Zero;
        InitializeProcThreadAttributeList(IntPtr.Zero, 1, 0, ref lpSize);
        IntPtr lpAttributeList = Marshal.AllocHGlobal(lpSize);
        InitializeProcThreadAttributeList(lpAttributeList, 1, 0, ref lpSize);

        UpdateProcThreadAttribute(lpAttributeList, 0, PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE, hPC, (IntPtr)IntPtr.Size, IntPtr.Zero, IntPtr.Zero);

        STARTUPINFOEX siex = new STARTUPINFOEX();
        siex.StartupInfo.cb = Marshal.SizeOf(typeof(STARTUPINFOEX));
        siex.lpAttributeList = lpAttributeList;

        PROCESS_INFORMATION pi;
        string cwd = string.IsNullOrEmpty(currentDirectory) ? null : currentDirectory;
        bool ok = CreateProcess(null, commandLine, IntPtr.Zero, IntPtr.Zero, false, EXTENDED_STARTUPINFO_PRESENT, IntPtr.Zero, cwd, ref siex, out pi);
        if (!ok) {
            ClosePseudoConsole(hPC);
            return 1;
        }

        FileStream ptyIn = new FileStream(new SafeFileHandle(hInWrite, true), FileAccess.Write);
        FileStream ptyOut = new FileStream(new SafeFileHandle(hOutRead, true), FileAccess.Read);

        Stream stdIn = Console.OpenStandardInput();
        Stream stdOut = Console.OpenStandardOutput();

        // Worker thread to pipe ConPTY output to stdout
        System.Threading.Thread outThread = new System.Threading.Thread(() => {
            byte[] buf = new byte[8192];
            try {
                int read;
                while ((read = ptyOut.Read(buf, 0, buf.Length)) > 0) {
                    stdOut.Write(buf, 0, read);
                    stdOut.Flush();
                }
            } catch {}
        });
        outThread.IsBackground = true;
        outThread.Start();

        // Worker thread to pipe stdin to ConPTY input
        System.Threading.Thread inThread = new System.Threading.Thread(() => {
            byte[] buf = new byte[8192];
            try {
                int read;
                while ((read = stdIn.Read(buf, 0, buf.Length)) > 0) {
                    ptyIn.Write(buf, 0, read);
                    ptyIn.Flush();
                }
            } catch {}
        });
        inThread.IsBackground = true;
        inThread.Start();

        // Wait for process completion
        WaitForSingleObject(pi.hProcess, 0xFFFFFFFF);
        uint exitCode = 0;
        GetExitCodeProcess(pi.hProcess, out exitCode);

        try { ClosePseudoConsole(hPC); } catch {}
        try { CloseHandle(pi.hProcess); } catch {}
        try { CloseHandle(pi.hThread); } catch {}

        return (int)exitCode;
    }
}
'@

Add-Type -TypeDefinition $conptySource -PassThru | Out-Null
$exitCode = [ConPtyRunner]::Run($CommandLine, $CurrentDirectory, [int16]$Cols, [int16]$Rows)
exit $exitCode
