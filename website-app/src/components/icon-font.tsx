// Material Symbols, subset to the glyphs the site actually uses and loaded only
// by the routes that render them (features, docs, api-reference, security).
// The homepage never pays for it.
//
// Adding an icon? Add its name here. Google requires the list sorted.
// A name missing from this list renders as plain text (e.g. "lock").
const ICONS = [
  "account_tree", "ads_click", "alternate_email", "api", "assignment_ind", "attach_file", "attach_money",
  "auto_awesome", "badge", "bar_chart", "block", "bolt", "call_split", "campaign", "chat", "chat_bubble", "check_circle",
  "code", "corporate_fare", "desktop_windows", "devices", "done_all", "download", "edit", "edit_note",
  "event_busy", "filter_alt", "filter_list", "forum", "gavel", "group", "help", "history", "hub", "info",
  "insights", "install_mobile", "key", "label", "language", "lock", "low_priority", "mail", "manage_accounts",
  "manage_history", "map", "menu_book", "message", "monitoring", "notifications", "notifications_active",
  "person", "person_add", "person_off", "person_search", "photo_camera", "picture_as_pdf", "policy",
  "query_stats", "quickreply", "quiz", "receipt_long", "repeat", "reply", "request_quote", "schedule",
  "schedule_send", "search", "send", "shield", "smart_toy", "smartphone", "sort", "speed", "splitscreen",
  "star", "star_rate", "sticky_note_2", "stop_circle", "storefront", "support_agent", "swap_horiz", "tab",
  "task_alt", "thumbs_up_down", "timer", "toll", "transfer_within_a_station", "travel_explore", "trending_up",
  "tune", "upload_file", "verified", "verified_user", "view_kanban", "visibility", "warning", "webhook",
  "wifi_off",
];

const HREF =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" +
  `&icon_names=${[...ICONS].sort().join(",")}&display=block`;

// React 19 hoists a <link rel="stylesheet" precedence> into <head> and dedupes it.
export function IconFont() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={HREF} precedence="default" />
    </>
  );
}
