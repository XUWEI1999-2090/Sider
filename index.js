
const http = require('http-server');
const server = http.createServer({
  root: '.',
  cors: true,
  cache: -1
});

server.listen(8080, '0.0.0.0', () => {
  console.log('Server running at http://0.0.0.0:8080');
});
