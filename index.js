const request = require('request-promise-native');

const apiUrl = 'https://api.zoomeye.org';

const FILTERS = {
  // Base filters
  /**
   * ip address [ip:192.168.1.1]
   */
  ip: 'ip',
  /**
   * city name [city:beijing]
   */
  city: 'city',
  /**
   * country name [country:china]
   */
  country: 'country',

  // Host Search Filters
  /**
   * application\software\product and etc.) [app: ProFTD]
   */
  app: 'app',
  /**
   * versions [ver:2.1]
   */
  ver: 'ver',
  /**
   * device type [device:router]
   */
  device: 'device',
  /**
   * operating system [os:windows]
   */
  os: 'os',
  /**
   * service [service:http]
   */
  service: 'service',
  /**
   * CIDR Address prefix [cidr:192.168.1.1/24]
   */
  cidr: 'cidr',
  /**
   * hostname [hostname:google.com]
   */
  hostname: 'hostname',
  /**
   * port number [port:80]
   */
  port: 'port',
  /**
   * asn number [asn:8978]
   */
  asn: 'asn',

  // WEB Search filters
  /**
   * web application [webapp:wordpress]
   */
  webapp: 'webapp',
  /**
   * HTTP Header query [header:server]
   */
  header: 'header',
  /**
   * meta keywords [keywords:baidu.com]
   */
  keywords: 'keywords',
  /**
   * HTTP Meta description [desc:hello]
   */
  desc: 'desc',
  /**
   * HTTP Title [title: baidu]
   */
  title: 'title',
  /**
   * site query [site:baidu.com]
   */
  site: 'site',
}

class ZoomEye {
  constructor(username, password = null) {
    this.accessToken = (username && !password) ? username : null;
    this.username = (username && password) ? username : null;
    this.password = password;
  }

  /**
   * Login to system
   */
  async login() {
    if (!this.username || !this.password) {
      throw 'login or password is not set';
    }
    const res = await this._req('/user/login', {
      username: this.username,
      password: this.password
    }, false);

    if (!res || !res.access_token) {
      throw res || 'Request return empty response'
    }

    this.accessToken = res.access_token;
    return this;
  }

  /**
   * Search the Host devices
   * @param {string} queryString Example: nginx
   * @param {object} filters Example: {ip: '123.123.123.123', port: 80}
   * @param {string} faces Comma siparated, alailable: app,device,service,os,port,country,city
   * @param {number} page Default is 1
   * @returns {object} {matches: object, faces: object, available: number, total: available, getNext: function, getPage: function}
   */
  async hostSearch(queryString, filters = null, faces = null, page = 1) {
    const query = this._buildQuery(queryString, filters, faces, page);
    const res = await this._req('/host/search?query=' + query);
    res.getNext = async () => await this.hostSearch(queryString, filters, faces, page++);
    res.getPage = async (nextPage) => await this.hostSearch(queryString, filters, faces, nextPage);
    return res;
  }

  /**
   * Search the Web technologies
   * @param {string} queryString Example: nginx
   * @param {object} filters Example: {ip: '123.123.123.123', port: 80}
   * @param {string} faces Comma siparated, alailable: webapp,component,framework,frontend,server,waf,os,country,city
   * @param {number} page Default is 1
   * @returns {object} {matches: object, faces: object, available: number, total: available, getNext: function, getPage: function}
   */
  async webSearch(queryString, filters = null, faces = null, page = 1) {
    const query = this._buildQuery(queryString, filters, faces, page);
    const res = await this._req('/web/search?query=' + query);
    res.getNext = async () => await this.hostSearch(queryString, filters, faces, page++);
    res.getPage = async (nextPage) => await this.hostSearch(queryString, filters, faces, nextPage);
    return res;
  }

  /**
   * Build query from incoming parameters
   * @param {string} queryString 
   * @param {object} filters 
   * @param {string} faces 
   * @param {number} page 
   */
  _buildQuery(queryString, filters = null, faces = null, page = 1) {
    if (!queryString) {
      throw 'Query can\'t be empty';
    }
    let query = queryString;
    if (filters) {
      query += ' ';
      Object.keys(filters).forEach(key => query += key + ':' + filters[key]);
    }
    if (faces) {
      query += '&facets=' + faces;
    }
    query += '&page=' + page;
    return query;
  }

  /**
   * Make request and return JSON object
   * @param {string} endpoint Endpoint starting from /
   * @param {object} data For send POST
   * @param {boolean} useAuth Default is true. Use auth header in request
   */
  async _req(endpoint, data, useAuth = true) {
    const options = {
      url: `${apiUrl}${endpoint}`,
      resolveWithFullResponse: true,
      simple: false,
      json: true
    }
    if (data) {
      options.method = 'POST';
      options.body = data;
    }
    if (useAuth) {
      options.headers = {
        Authorization: 'JWT ' + this.accessToken
      }
    }

    const res = await request(options);
    if (res.statusCode != 200) {
      throw res.body
    }
    return res.body;
  }
}

// ZoomEye.FILTERS = FILTERS;
module.exports = ZoomEye;