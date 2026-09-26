/** Spec Appendix A, fixture A1: parsing it must report "Parsed · 25 values". */
export const fixtureA1 = `{
  "statusCode": 200,
  "headers": { "Content-Type": "application/json; odata.metadata=minimal" },
  "body": {
    "value": [
      { "ID": 14, "Title": "Laptop refresh", "Status": "Approved", "Amount": 5000, "Urgent": false,
        "Requester": { "DisplayName": "Dana O'Brien", "Email": "dana@contoso.com" } },
      { "ID": 15, "Title": "Monitor", "Status": "Pending", "Amount": 320, "Urgent": true,
        "Requester": { "DisplayName": "Lee Park", "Email": "lee@contoso.com" } }
    ],
    "@odata.nextLink": null
  }
}`;

/** A Compose output: an object with no body key (user story 1, scenario 4). */
export const composeSample = `{ "customer": { "name": "Contoso", "tier": "gold" }, "matrix": [[1, 2], [3, 4]] }`;

/** A trigger's full output (user story 2, scenario 2). */
export const triggerFullSample = `{
  "headers": { "content-type": "application/json" },
  "body": { "customer": { "name": "Contoso" } }
}`;

/** A trigger's request body (user story 2, scenario 1). */
export const triggerBodySample = `{ "customer": { "name": "Contoso" } }`;
