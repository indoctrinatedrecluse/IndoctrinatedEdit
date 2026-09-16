import { SnippetDefinition } from '../extensionTypes'

export const rubySnippets: SnippetDefinition[] = [
  // --- Modern Ruby 3.2 / 3.3+ Core ---
  {
    label: 'ruby-data-define',
    detail: 'Ruby 3.2+: Immutable Data Class (Data.define)',
    documentation: 'Fast, immutable value object with positional and keyword arguments',
    insertText: '${1:UserProfile} = Data.define(:id, :username, :email, :roles) do\n  def admin?\n    roles.include?("admin")\n  end\nend\n\nuser = ${1:UserProfile}.new(id: 101, username: "recluse", email: "recluse@example.com", roles: ["admin"])\n$0',
  },
  {
    label: 'ruby-pattern-match',
    detail: 'Ruby 3+: Structural Pattern Matching',
    documentation: 'Pattern matching using case/in syntax with array and hash destructuring',
    insertText: 'case ${1:response}\nin { status: 200, body: { data: Array => items } }\n  puts "Retrieved #{items.size} items successfully"\nin { status: 400..499, error: String => msg }\n  puts "Client error occurred: #{msg}"\nin { status: 500..599 }\n  puts "Server failure encountered"\nelse\n  puts "Unexpected response format"\nend\n$0',
  },

  // --- Ruby on Rails 7 / 8 Ecosystem ---
  {
    label: 'rails-model',
    detail: 'Rails: ActiveRecord Model with Associations & Validations',
    documentation: 'ActiveRecord domain model with scopes, callbacks, associations, and validation rules',
    insertText: 'class ${1:Article} < ApplicationRecord\n  belongs_to :user\n  has_many :comments, dependent: :destroy\n\n  validates :title, presence: true, length: { minimum: 5, maximum: 150 }\n  validates :slug, presence: true, uniqueness: true\n\n  scope :published, -> { where(is_published: true).order(published_at: :desc) }\n  scope :recent, ->(limit = 10) { published.limit(limit) }\n\n  before_validation :generate_slug, on: :create\n\n  private\n\n  def generate_slug\n    self.slug = title.parameterize if title.present?\n  end\nend\n$0',
  },
  {
    label: 'rails-api-controller',
    detail: 'Rails: ActionController::API with Strong Parameters',
    documentation: 'Lightweight API controller with error handling and json serialization',
    insertText: 'module Api\n  module V1\n    class ${1:Articles}Controller < ActionController::API\n      before_action :set_${2:article}, only: %i[show update destroy]\n\n      def index\n        @${1:articles} = ${3:Article}.published.page(params[:page])\n        render json: @${1:articles}\n      end\n\n      def show\n        render json: @${2:article}\n      end\n\n      def create\n        @${2:article} = ${3:Article}.new(${2:article}_params)\n        if @${2:article}.save\n          render json: @${2:article}, status: :created\n        else\n          render json: { errors: @${2:article}.errors.full_messages }, status: :unprocessable_entity\n        end\n      end\n\n      private\n\n      def set_${2:article}\n        @${2:article} = ${3:Article}.find(params[:id])\n      end\n\n      def ${2:article}_params\n        params.require(:${2:article}).permit(:title, :content, :is_published)\n      end\n    end\n  end\nend\n',
  },
  {
    label: 'rails-migration',
    detail: 'Rails: ActiveRecord Database Migration',
    documentation: 'Database migration with table creation, indices, and foreign key constraints',
    insertText: 'class Create${1:Articles} < ActiveRecord::Migration[7.1]\n  def change\n    create_table :${2:articles} do |t|\n      t.references :user, null: false, foreign_key: true\n      t.string :title, null: false\n      t.string :slug, null: false\n      t.text :content\n      t.boolean :is_published, default: false, null: false\n      t.datetime :published_at\n\n      t.timestamps\n    end\n\n    add_index :${2:articles}, :slug, unique: true\n    add_index :${2:articles}, :is_published\n  end\nend\n',
  },
  {
    label: 'rails-routes',
    detail: 'Rails: config/routes.rb API Namespacing',
    documentation: 'RESTful API routing with versioning and resource nesting',
    insertText: 'Rails.application.routes.draw do\n  namespace :api do\n    namespace :v1 do\n      resources :${1:articles} do\n        resources :comments, only: %i[index create]\n      end\n      get "health", to: ->(env) { [200, { "Content-Type" => "application/json" }, [{ status: "ok", engine: "IndoctrinatedEdit Rails" }.to_json]] }\n    end\n  end\nend\n',
  },
  {
    label: 'rails-job',
    detail: 'Rails: ApplicationJob Async Worker',
    documentation: 'ActiveJob background processing worker with retry policies',
    insertText: 'class ${1:ProcessAssetJob} < ApplicationJob\n  queue_as :default\n  retry_on StandardError, wait: :polynomially_longer, attempts: 3\n\n  def perform(${2:asset_id})\n    asset = Asset.find(${2:asset_id})\n    Rails.logger.info "✨ Processing Liquid Glass Asset: #{asset.id}"\n    # Execute background tasks\n  end\nend\n',
  },
  {
    label: 'rspec-model-spec',
    detail: 'RSpec: Model Unit Test Spec',
    documentation: 'RSpec test suite with let, subject, and validation / association matchers',
    insertText: 'require "rails_helper"\n\nRSpec.describe ${1:Article}, type: :model do\n  subject(:article) { build(:article) }\n\n  describe "associations" do\n    it { is_expected.to belong_to(:user) }\n    it { is_expected.to have_many(:comments).dependent(:destroy) }\n  end\n\n  describe "validations" do\n    it { is_expected.to validate_presence_of(:title) }\n    it { is_expected.to validate_uniqueness_of(:slug) }\n  end\nend\n',
  },
  {
    label: 'gemfile',
    detail: 'Bundler: Modern Gemfile Manifest',
    documentation: 'Standard Ruby on Rails Gemfile with environment groups',
    insertText: 'source "https://rubygems.org"\ngit_source(:github) { |repo| "https://github.com/#{repo}.git" }\n\nruby ">= 3.2.0"\n\ngem "rails", "~> 7.1"\ngem "puma", ">= 5.0"\ngem "bootsnap", require: false\n\ngroup :development, :test do\n  gem "rspec-rails", "~> 6.0"\n  gem "factory_bot_rails"\n  gem "debug", platforms: %i[mri windows]\nend\n',
  },
]
