export const en = {
  // Common
  app_name: 'Share2Family',
  error: 'Error',
  error_generic: 'Something went wrong',
  or: 'or',
  save: 'Save',
  cancel: 'Cancel',
  back: 'Back',
  delete: 'Delete',
  go_to_home: 'Go to home',
  create: 'Create',
  next: 'Next',

  // Onboarding
  onboarding_title_1: 'Everything, shared\nwith the ones you love',
  onboarding_subtitle_1: 'Share2Family',
  onboarding_title_2: 'Lists for everything\nyou do together',
  onboarding_subtitle_2: 'Groceries, movies, books, and more',
  onboarding_title_3: 'A cozy place for\nyour shared moments',
  onboarding_subtitle_3: 'Always in sync, always together',
  onboarding_get_started: 'Get started',

  // Sign in
  signin_subtitle: 'Share everything with\nyour loved ones',
  signin_apple: 'Sign in with Apple',
  signin_google: 'Sign in with Google',
  signin_anonymous: 'Continue without account',
  signin_disclaimer: 'You can link your account later in Settings',
  signin_failed: 'Sign in failed',
  link_account_subtitle: 'Link your account to keep your data safe\nand sync across devices',

  // Profile setup
  profile_setup_title: 'Welcome!',
  profile_setup_subtitle: 'What should we call you?',
  profile_setup_placeholder: 'Your name',
  profile_setup_continue: 'Continue',
  profile_setup_skip: 'Skip for now',

  // Family choice
  family_choice_title: 'Welcome!',
  family_choice_subtitle: 'Get started by creating or joining a family',
  family_create_card_title: 'Create a family',
  family_create_card_subtitle: 'Start a new shared space and invite your partner',
  family_join_card_title: 'Join a family',
  family_join_card_subtitle: 'Enter an invite code to join your partner',

  // Create family
  create_family_title: 'Create a family',
  create_family_subtitle: 'Choose a name for your shared space',
  create_family_placeholder: 'e.g. "The Demir Family"',
  create_family_name_required: 'Name required',
  create_family_name_required_message: 'Please enter a family name',

  // Join family
  join_family_title: 'Join a family',
  join_family_subtitle: 'Enter the invite code from your partner',
  join_family_placeholder: 'XK3-PQ7',
  join_family_button: 'Join',
  join_family_error_title: 'Could not join',
  join_family_error_message: 'Invalid or expired code',

  // Invite
  invite_title: 'Family created!',
  invite_subtitle: 'Share this code with your partner to join',
  invite_code_label: 'Invite code',
  invite_expires: 'Expires in 7 days or after first use',
  invite_share: 'Share code',
  invite_share_message: 'Join our family "{{name}}" on Share2Family! Use invite code: {{code}}',

  // Success
  success_title: "You're all set!",
  success_subtitle: "You've joined {{name}}",

  // Home
  home_empty_title: 'No lists yet',
  home_empty_description: 'Create your first shared checklist to get started',
  home_empty_action: 'Create a list',
  home_new_checklist: 'New checklist',
  home_checklist_placeholder: 'Checklist name',

  // Checklist detail
  checklist_empty_title: 'This list is empty',
  checklist_empty_description: 'Add your first item below',
  checklist_add_placeholder: 'Add item...',
  checklist_completed: 'Completed ({{count}})',
  checklist_edit_title: 'Edit list',
  checklist_edit_placeholder: 'List name',
  checklist_delete_button: 'Delete list',
  checklist_delete_title: 'Delete list',
  checklist_delete_message: 'Are you sure? This will archive the list and all its items.',

  // Edit profile
  edit_profile_title: 'Edit Profile',
  edit_profile_label: 'Display name',
  edit_profile_placeholder: 'Your name',
  edit_profile_name_required: 'Name required',
  edit_profile_name_required_message: 'Please enter a display name',

  // Edit family
  edit_family_title: 'Edit Family',
  edit_family_name_label: 'Family name',
  edit_family_name_placeholder: 'e.g. The Demir Family',
  edit_family_members: 'Members',
  edit_family_invite_code: 'Invite Code',
  edit_family_invite_hint: 'Share this code with your partner to join',
  edit_family_leave: 'Leave family',
  edit_family_leave_title: 'Leave family',
  edit_family_leave_message: 'Are you sure? You will lose access to all shared lists.',
  edit_family_leave_confirm: 'Leave',

  // Settings
  settings_title: 'Settings',
  settings_guest_account: 'Guest account',
  settings_family: 'Family',
  settings_preferences: 'Preferences',
  settings_theme: 'Theme',
  settings_theme_system: 'System',
  settings_theme_light: 'Light',
  settings_theme_dark: 'Dark',
  settings_language: 'Language',
  settings_notifications: 'Notifications',
  settings_notifications_label: 'Push notifications',
  settings_offline_mode: 'Work Offline',
  settings_offline_downloading: 'Downloading...',
  settings_offline_need_internet: 'Please connect to the internet to download your data first.',
  offline_banner_message: 'No internet connection',
  offline_banner_description: 'Check your connection or enable\nWork Offline in Settings.',
  settings_signin_prompt: 'Sign in',
  settings_signout: 'Sign out',
  settings_signout_title: 'Sign out',
  settings_signout_message: 'Are you sure you want to sign out?',
  settings_version: 'Share2Family v{{version}}',
};

export type TranslationKeys = typeof en;
