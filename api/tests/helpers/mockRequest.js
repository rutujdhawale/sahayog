// tests/helpers/mockRequest.js
const { EventEmitter } = require('events');

function createMockReq({ method = 'GET', url = '/', headers = {}, body = null, cookies = {} }) {
  const req = new EventEmitter();
  req.method = method.toUpperCase();
  req.url = url;
  req.originalUrl = url;
  req.headers = {
    'content-type': 'application/json',
    ...headers,
  };
  req.cookies = cookies;
  req.body = body;

  const connection = {
    remoteAddress: '127.0.0.1',
    encrypted: false,
    destroy: () => {},
  };
  req.connection = connection;
  req.socket = connection;
  req.ip = '127.0.0.1';
  req.get = (name) => req.headers[name.toLowerCase()] || '';
  return req;
}

function createMockRes() {
  const res = new EventEmitter();
  res.statusCode = 200;
  res._headers = {};
  res._body = null;

  res.setHeader = (key, val) => {
    res._headers[key.toLowerCase()] = val;
    return res;
  };
  res.getHeader = (key) => res._headers[key.toLowerCase()];

  res.status = (code) => {
    res.statusCode = code;
    return res;
  };

  res.cookie = (name, val, options) => {
    res._headers['set-cookie'] = `${name}=${val}`;
    return res;
  };

  res.json = (data) => {
    res._body = data;
    res.emit('finish');
    return res;
  };

  res.send = (data) => {
    res._body = data;
    res.emit('finish');
    return res;
  };

  res.redirect = (url) => {
    res.statusCode = 302;
    res._headers['location'] = url;
    res.emit('finish');
    return res;
  };

  return res;
}

function simulateRequest(app, options = {}) {
  return new Promise((resolve) => {
    const req = createMockReq(options);
    const res = createMockRes();

    res.on('finish', () => {
      resolve({
        status: res.statusCode,
        body: res._body,
        headers: res._headers,
      });
    });

    try {
      app(req, res);
    } catch (err) {
      resolve({
        status: 500,
        body: { error: err.message },
        headers: {},
      });
    }
  });
}

module.exports = { simulateRequest };
