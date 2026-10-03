// Loaded before every test file. The tests check the backend's own
// behaviour, so they must not depend on whether an AI service happens to
// be running: with no address, every AI call uses the stand-in.
// (ai-client.test.ts points this at its own fake service.)
process.env.AI_SERVICE_URL = "";
