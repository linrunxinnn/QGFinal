import axios from "axios";

const request = axios.create({
  baseURL: "http://localhost:3000",
  withCredentials: true, // 允许携带cookie
  timeout: 10000,
});

//请求拦截器  响应拦截器

export default request;
