import { refreshView } from "../lib/refresh-view.js";

// envs
// MATTERS_PG_HOST
// MATTERS_PG_USER
// MATTERS_PG_PASSWORD
// MATTERS_PG_DATABASE

// AWS EventBridge can configure the input event sent to Lambda,
// see https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html for info.
type RefreshViewEvent = {
  data: {
    viewName: string;
  };
};

export const handler = async (event: RefreshViewEvent) =>
  refreshView(event.data.viewName);
