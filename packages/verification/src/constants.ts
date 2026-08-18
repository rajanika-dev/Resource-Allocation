/**
 * Named constants for the deterministic verification engine (SPEC.md
 * section 11 / Task 3). Keeping these in one place avoids magic numbers
 * scattered through the classification logic.
 */

/** Weight given to Jira activity share when combining observed sources. */
export const JIRA_WEIGHT = 0.65;
/** Weight given to Calendar activity share when combining observed sources. */
export const CALENDAR_WEIGHT = 0.35;

/** Below this total Jira activity count, Jira is not "meaningful" evidence. */
export const MIN_JIRA_ACTIVITY = 2;
/** Below this total Calendar hours, Calendar is not "meaningful" evidence. */
export const MIN_CALENDAR_HOURS = 2;

/** distributionGap (0-100 scale) at or above this value is classified MISMATCH. */
export const MISMATCH_GAP_THRESHOLD = 50;

/** Source distribution gap (0-100 scale) at or below this value means Jira and Calendar "broadly agree". */
export const SOURCE_AGREEMENT_MAX_GAP = 25;
