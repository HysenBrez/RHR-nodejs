import { UnAuthenticatedError } from "../errors/index.js";

export const adminPermissions = (user) => {
  if (user.role === "admin" || user.role === "user" || user.role === "manager")
    return;
  throw new UnAuthenticatedError("Not authorized to access this route");
};

export const adminAndManagerPermissions = (user) => {
  if (user.role === "admin" || user.role === "manager" || user.role === "user")
    return;
  throw new UnAuthenticatedError("Not authorized to access this route");
};
