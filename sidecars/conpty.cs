using System;
using System.IO;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public static class Program
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
    public static extern bool DeleteProcThreadAttributeList(IntPtr lpAttributeList);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CreateProcess(string lpApplicationName, string lpCommandLine, IntPtr lpProcessAttributes, IntPtr lpThreadAttributes, bool bInheritHandles, uint dwCreationFlags, IntPtr lpEnvironment, string lpCurrentDirectory, ref STARTUPINFOEX lpStartupInfo, out PROCESS_INFORMATION lpProcessInformation);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern uint WaitForSingleObject(IntPtr hHandle, uint dwMilliseconds);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool GetExitCodeProcess(IntPtr hProcess, out uint lpExitCode);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hObject);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern IntPtr GetStdHandle(int nStdHandle);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool ReadFile(IntPtr hFile, byte[] lpBuffer, int nNumberOfBytesToRead, out int lpNumberOfBytesRead, IntPtr lpOverlapped);

    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool WriteFile(IntPtr hFile, byte[] lpBuffer, int nNumberOfBytesToWrite, out int lpNumberOfBytesWritten, IntPtr lpOverlapped);

    public const int STD_INPUT_HANDLE = -10;
    public const int STD_OUTPUT_HANDLE = -11;
    public const uint EXTENDED_STARTUPINFO_PRESENT = 0x00080000;
    public static readonly IntPtr PROC_THREAD_ATTRIBUTE_PSEUDOCONSOLE = (IntPtr)0x00020016;

    public static int Main(string[] args)
    {
        if (args.Length < 4)
        {
            Console.Error.WriteLine("Usage: conpty.exe <cols> <rows> <cwd> <commandLine>");
            return 1;
        }

        short cols = 120;
        short rows = 30;
        short.TryParse(args[0], out cols);
        short.TryParse(args[1], out rows);
        if (cols <= 0) cols = 120;
        if (rows <= 0) rows = 30;

        string cwd = args[2];
        if (string.IsNullOrEmpty(cwd) || cwd == ".") cwd = null;

        // Join remaining arguments as the command line
        string commandLine = string.Join(" ", args, 3, args.Length - 3);

        IntPtr hInRead, hInWrite, hOutRead, hOutWrite;
        if (!CreatePipe(out hInRead, out hInWrite, IntPtr.Zero, 0) ||
            !CreatePipe(out hOutRead, out hOutWrite, IntPtr.Zero, 0))
        {
            return 1;
        }

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
        bool ok = CreateProcess(null, commandLine, IntPtr.Zero, IntPtr.Zero, false, EXTENDED_STARTUPINFO_PRESENT, IntPtr.Zero, cwd, ref siex, out pi);
        if (!ok)
        {
            ClosePseudoConsole(hPC);
            return 1;
        }

        IntPtr stdIn = GetStdHandle(STD_INPUT_HANDLE);
        IntPtr stdOut = GetStdHandle(STD_OUTPUT_HANDLE);

        // Worker thread to pipe ConPTY output -> stdout
        System.Threading.Thread outThread = new System.Threading.Thread(() => {
            byte[] buf = new byte[8192];
            int read;
            while (ReadFile(hOutRead, buf, buf.Length, out read, IntPtr.Zero) && read > 0)
            {
                int written;
                WriteFile(stdOut, buf, read, out written, IntPtr.Zero);
            }
        });
        outThread.IsBackground = true;
        outThread.Start();

        // Worker thread to pipe stdin -> ConPTY input
        System.Threading.Thread inThread = new System.Threading.Thread(() => {
            byte[] buf = new byte[8192];
            int read;
            while (ReadFile(stdIn, buf, buf.Length, out read, IntPtr.Zero) && read > 0)
            {
                int written;
                WriteFile(hInWrite, buf, read, out written, IntPtr.Zero);
            }
            try { CloseHandle(hInWrite); } catch {}
        });
        inThread.IsBackground = true;
        inThread.Start();

        WaitForSingleObject(pi.hProcess, 0xFFFFFFFF);
        uint exitCode = 0;
        GetExitCodeProcess(pi.hProcess, out exitCode);

        try { ClosePseudoConsole(hPC); } catch {}
        try { CloseHandle(pi.hProcess); } catch {}
        try { CloseHandle(pi.hThread); } catch {}
        try { DeleteProcThreadAttributeList(lpAttributeList); } catch {}
        try { Marshal.FreeHGlobal(lpAttributeList); } catch {}

        return (int)exitCode;
    }
}
