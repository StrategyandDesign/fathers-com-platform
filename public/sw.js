self.addEventListener("push", (event) => {
  let title = "Fathers.com";
  let body = "";
  let url = "/father/trainings";
  try {
    const data = event.data ? event.data.json() : {};
    if (typeof data.title === "string") title = data.title;
    if (typeof data.body === "string") body = data.body;
    if (typeof data.url === "string" && data.url.startsWith("/")) url = data.url;
    if (typeof data.url === "string" && data.url.startsWith("http")) {
      try {
        url = new URL(data.url).pathname || url;
      } catch {
        url = "/father/trainings";
      }
    }
  } catch {
    body = "";
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/father/trainings";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
