/**
 * English locale strings for Hermes WebUI.
 * Ported from static/i18n.js LOCALES.en.
 *
 * Function-based values from the source have been converted to vue-i18n
 * named-parameter format: `{param}` for interpolation, and pipe-separated
 * plurals `singular | plural` for count-based keys.
 */

const en = {
  _lang: 'en',
  _label: 'English',
  _speech: 'en-US',

  // boot.js / streaming
  cancelling: 'Cancelling\u2026',
  cancel_failed: 'Cancel failed: ',
  mic_denied: 'Microphone access denied. Check browser permissions.',
  mic_no_speech: 'No speech detected. Try again.',
  mic_network: 'Speech recognition unavailable.',
  mic_error: 'Voice input error: ',
  session_imported: 'Session imported',
  import_failed: 'Import failed: ',
  import_invalid_json: 'Invalid JSON',
  image_pasted: 'Image pasted: ',

  // messages.js
  edit_message: 'Edit message',
  regenerate: 'Regenerate response',
  copy: 'Copy',
  copied: 'Copied!',
  you: 'You',
  thinking: 'Thinking',
  expand_all: 'Expand all',
  collapse_all: 'Collapse all',
  edit_failed: 'Edit failed: ',
  regen_failed: 'Regenerate failed: ',
  reconnect_active: 'A response is still being generated. Reload when ready?',
  reconnect_finished: 'A response was in progress when you last left. Messages may have updated.',

  // approval card
  approval_heading: 'Approval required',
  approval_desc_prefix: 'Dangerous command detected',
  approval_btn_once: 'Allow once',
  approval_btn_once_title: 'Allow this one command (Enter)',
  approval_btn_session: 'Allow session',
  approval_btn_session_title: 'Allow for this conversation session',
  approval_btn_always: 'Always allow',
  approval_btn_always_title: 'Always allow this command pattern',
  approval_btn_deny: 'Deny',
  approval_btn_deny_title: 'Deny \u2014 do not run this command',
  approval_responding: 'Responding\u2026',

  // clarify
  clarify_heading: 'Clarification needed',
  clarify_hint: 'Pick a choice, or type your own answer below.',
  clarify_other: 'Other',
  clarify_send: 'Send',
  clarify_input_placeholder: 'Type your response\u2026',
  clarify_responding: 'Responding\u2026',

  // sessions
  untitled: 'Untitled',
  // n_messages: (n) => `${n} messages`  →  vue-i18n plural
  n_messages: '{n} message | {n} messages',
  model_unavailable: ' (unavailable)',

  // commands.js
  cmd_clear: 'Clear conversation messages',
  cmd_compress: 'Manually compress conversation context (usage: /compress [focus topic])',
  cmd_model: 'Switch model (e.g. /model gpt-4o)',
  cmd_workspace: 'Switch workspace by name',
  cmd_new: 'Start a new chat session',
  cmd_usage: 'Toggle token usage display on/off',
  cmd_theme: 'Switch appearance (theme: system/dark/light, skin: default/ares/mono/slate/poseidon/sisyphus/charizard)',
  cmd_personality: 'Switch agent personality',
  cmd_skills: 'List available Hermes skills',
  available_commands: 'Available commands:',
  type_slash: 'Type / to see commands',
  conversation_cleared: 'Conversation cleared',
  switched_to: 'Switched to ',
  new_session: 'New session created',
  compressing: 'Requesting context compression...',
  token_usage_on: 'Token usage on',
  token_usage_off: 'Token usage off',
  theme_set: 'Theme: ',
  no_active_session: 'No active session',
  cmd_stop: 'Stop the current response',
  cmd_title: 'Get or set the session title',
  cmd_retry: 'Resend the last message',
  cmd_undo: 'Remove the last exchange',
  cmd_status: 'Show session info',
  cmd_voice: 'Toggle microphone input',
  stream_stopped: 'Response stopped.',
  no_active_task: 'No active task to stop.',
  cancel_unavailable: 'Cancel not available.',
  undid_messages_suffix: 'message(s).',
  status_heading: 'Session Status',

  // ui.js
  no_workspace: 'No workspace',
  workspace_empty_no_path: 'No workspace selected. Set a workspace in Settings \u2192 Workspace to browse files.',
  workspace_empty_dir: 'This workspace is empty.',
  dialog_confirm_title: 'Confirm action',
  dialog_prompt_title: 'Enter a value',
  dialog_confirm_btn: 'Confirm',

  // workspace.js
  discard: 'Discard',
  save: 'Save',
  edit: 'Edit',
  clear: 'Clear',
  create: 'Create',
  remove: 'Remove',
  save_title: 'Save changes',
  edit_title: 'Edit this file',
  saved: 'Saved',
  save_failed: 'Save failed: ',
  image_load_failed: 'Could not load image',
  file_open_failed: 'Could not open file',
  double_click_rename: 'Double-click to rename',
  renamed_to: 'Renamed to ',
  rename_failed: 'Rename failed: ',
  delete_title: 'Delete',
  // delete_confirm: (name) => `Delete ${name}?` → named param
  delete_confirm: 'Delete {name}?',
  deleted: 'Deleted ',
  delete_failed: 'Delete failed: ',
  new_file_prompt: 'New file name (e.g. notes.md):',
  new_folder_prompt: 'New folder name:',
  folder_created: 'Created folder ',
  upload_failed: 'Upload failed: ',

  // settings panel
  settings_title: 'Settings',
  settings_save_btn: 'Save Settings',
  settings_label_model: 'Default Model',
  settings_label_send_key: 'Send Key',
  settings_label_theme: 'Theme',
  settings_label_skin: 'Skin',
  settings_label_language: 'Language',
  settings_label_token_usage: 'Show token usage',
  settings_label_bubble_layout: 'Chat bubble layout',
  settings_label_cli_sessions: 'Show agent sessions',
  settings_label_check_updates: 'Check for updates',
  settings_label_bot_name: 'Assistant Name',
  settings_label_password: 'Access Password',
  settings_saved: 'Settings saved',
  settings_save_failed: 'Save failed: ',
  settings_load_failed: 'Failed to load settings: ',
  settings_label_sound: 'Notification sound',
  settings_label_notifications: 'Browser notifications',

  // login page
  login_title: 'Sign in',
  login_subtitle: 'Enter your password to continue',
  login_placeholder: 'Password',
  login_btn: 'Sign in',
  login_invalid_pw: 'Invalid password',
  login_conn_failed: 'Connection failed',

  // tabs / sidebar
  tab_chat: 'Chat',
  tab_tasks: 'Tasks',
  tab_skills: 'Skills',
  tab_memory: 'Memory',
  tab_workspaces: 'Spaces',
  tab_profiles: 'Profiles',
  tab_todos: 'Todos',
  new_conversation: 'New conversation',
  filter_conversations: 'Filter conversations...',
  scheduled_jobs: 'Scheduled jobs',
  new_job: 'New job',
  loading: 'Loading...',
  search_skills: 'Search skills...',
  new_skill: 'New skill',
  personal_memory: 'Personal memory',
  current_task_list: 'Current task list',
  workspace_desc: 'Add and switch workspaces for your sessions.',
  new_profile: 'New profile',
  transcript: 'Transcript',
  download_transcript: 'Download as Markdown',
  import: 'Import',
  cancel: 'Cancel',
  create_job: 'Create job',
  save_skill: 'Save skill',
  editing: 'Editing',

  // empty state
  empty_title: 'What can I help with?',
  empty_subtitle: 'Ask anything, run commands, explore files, or manage your scheduled tasks.',
  suggest_files: 'What files are in this workspace?',
  suggest_schedule: "What\u2019s on my schedule today?",
  suggest_plan: 'Help me plan a small project.',

  // onboarding
  onboarding_title: 'Welcome to Hermes Web UI',

  // cron
  cron_no_jobs: 'No scheduled jobs found.',
  cron_status_off: 'off',
  cron_status_paused: 'paused',
  cron_status_error: 'error',
  cron_status_active: 'active',
  cron_next: 'Next',
  cron_last: 'Last',
  cron_run_now: 'Run now',
  cron_pause: 'Pause',
  cron_resume: 'Resume',
  cron_job_created: 'Job created',
  cron_job_triggered: 'Job triggered',
  cron_job_paused: 'Job paused',
  cron_job_resumed: 'Job resumed',
  cron_job_updated: 'Job updated',
  cron_delete_confirm_title: 'Delete cron job',
  cron_delete_confirm_message: 'This cannot be undone.',
  cron_job_deleted: 'Job deleted',

  // todos
  todos_no_active: 'No active task list in this session.',

  // skills
  skills_no_match: 'No skills match.',
  skill_name_required: 'Skill name is required',
  skill_updated: 'Skill updated',
  skill_created: 'Skill created',

  // memory
  memory_notes_label: 'memory (notes)',
  memory_saved: 'Memory saved',
  my_notes: 'My Notes',
  user_profile: 'User Profile',
  no_notes_yet: 'No notes yet.',
  no_profile_yet: 'No profile yet.',

  // workspaces
  workspace_added: 'Workspace added',
  workspace_removed: 'Workspace removed',
  // workspace_switched_to: (name) => `Switched to ${name}` → named param
  workspace_switched_to: 'Switched to {name}',

  // profiles
  profiles_no_profiles: 'No profiles found.',
  profile_active: 'ACTIVE',
  profile_no_configuration: 'No configuration',
  profile_use: 'Use',
  profile_switch_title: 'Switch to this profile',
  profile_delete_title: 'Delete this profile',
  profile_default_label: '(default)',
  profile_name_placeholder: 'Profile name (lowercase, a-z 0-9 hyphens)',
  profile_clone_label: 'Clone config from active profile',
  profile_base_url_placeholder: 'Base URL (optional, e.g. http://localhost:11434)',
  profile_api_key_placeholder: 'API key (optional)',
  manage_profiles: 'Manage profiles',
  profiles_load_failed: 'Failed to load profiles',
  profiles_busy_switch: 'Cannot switch profiles while agent is running',
  profile_name_rule: 'Lowercase letters, numbers, hyphens, underscores only',
  profile_base_url_rule: 'Base URL must start with http:// or https://',

  // active conversation
  active_conversation_none: 'No active conversation selected.',

  // misc
  settings_unsaved_changes: 'You have unsaved changes.',
  sign_out_failed: 'Sign out failed: ',
  disable_auth_confirm_title: 'Disable password protection',
  disable_auth_confirm_message: 'Anyone will be able to access this instance.',
  auth_disabled: 'Auth disabled \u2014 password protection removed',
  disable_auth_failed: 'Failed to disable auth: ',
  sign_out: 'Sign Out',
  disable_auth: 'Disable Auth',
  password_placeholder: 'Enter new password\u2026',

  // model picker
  model_search_placeholder: 'Search models\u2026',
  model_search_no_results: 'No models found',
  model_custom_label: 'Custom model ID',
  model_custom_placeholder: 'e.g. openai/gpt-5.4',
}

export default en
export type EnLocale = typeof en
