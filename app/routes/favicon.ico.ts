export async function loader() {
  return new Response(null, {
    status: 204,
    statusText: 'No Content',
  });
}
