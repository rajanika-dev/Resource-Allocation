/** Shape of a single row in demo-data/jira.json (fake "Jira-like activity source"). */
export interface RawJiraActivity {
  assigneeEmail: string;
  projectKey: string;
  issuesTouched: number;
  week: string;
}
