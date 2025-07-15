// api/user.js
import request from "./request";

export function login(data) {
  return request.post("/log/login", data);
}
