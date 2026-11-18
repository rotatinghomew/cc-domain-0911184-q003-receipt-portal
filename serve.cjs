const { createPortal } = require('./portal/site.cjs');

const service = createPortal();
const port = Number(process.env.PORT || 3000);
service.start(port).then(url => console.log(url)).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => service.close().then(() => process.exit(0)));
}
