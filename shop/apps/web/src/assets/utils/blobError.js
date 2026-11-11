/** Read the API error message from a failed request made with responseType: 'blob'. */
export async function blobErrorMessage(error, fallback) {
  const data = error?.response?.data;
  try {
    if (data instanceof Blob) {
      const json = JSON.parse(await data.text());
      return json?.error?.message || fallback;
    }
    return data?.error?.message || fallback;
  } catch {
    return fallback;
  }
}
