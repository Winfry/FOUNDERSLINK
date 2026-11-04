// Stand-in for the native expo modules the service layer imports
// (expo-secure-store, expo-document-picker). Their real entry points need the
// native runtime, which Node does not have. The journey tests run with the web
// platform and the mock services, so none of these is actually called.
export async function getItemAsync(): Promise<string | null> {
  return null;
}
export async function setItemAsync(): Promise<void> {}
export async function deleteItemAsync(): Promise<void> {}
export async function getDocumentAsync(): Promise<{ canceled: true; assets: null }> {
  return { canceled: true, assets: null };
}
