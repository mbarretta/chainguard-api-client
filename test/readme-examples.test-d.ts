// Compile-only validation of the README's usage examples. Not executed by
// vitest run (no .test.ts suffix); included by `tsc --noEmit` to catch drift
// between docs and the generated types.

import { createChainguardClient } from "../src/index.js";

const client = createChainguardClient({ token: "x" });

async function pingExample() {
  const { data, error, response } = await client.GET("/ping/v2beta1/ping");
  void data;
  void error;
  void response.status;
}

async function listGroupsExample() {
  const { data, error } = await client.GET("/iam/v2beta1/groups", {
    params: { query: { pageSize: 50, "uidp.inRoot": true } },
  });
  void error;
  for (const group of data?.groups ?? []) {
    void group.uid;
    void group.name;
  }
}

async function listReposExample() {
  const { data } = await client.GET("/registry/v2beta1/repos");
  for (const repo of data?.repos ?? []) {
    void repo.uid;
    void repo.name;
  }
}

async function listAdvisoriesExample() {
  const { data } = await client.GET("/vulnerabilities/v2beta1/advisories", {
    params: { query: { pageSize: 100 } },
  });
  void data?.advisories?.length;
}

void pingExample;
void listGroupsExample;
void listReposExample;
void listAdvisoriesExample;
