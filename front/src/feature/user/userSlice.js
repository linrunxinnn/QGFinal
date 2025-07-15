import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLog: false,
  userInfo: null,
  token: null,
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setLogin(state, action) {
      state.token = action.payload.token;
      state.userInfo = action.payload.user;
    },
    setLogout(state) {
      state.token = null;
      state.userInfo = null;
    },
  },
});

export const { setLogin, setLogout } = userSlice.actions;
export default userSlice.reducer;
