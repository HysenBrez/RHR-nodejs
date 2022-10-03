import { UnAuthenticatedError } from "../errors/index.js";

export const adminPermissions = (user) => {
  if (user.role === "admin") return;
  throw new UnAuthenticatedError("Not authorized to access this route");
};

export const adminAndManagerPermissions = (user) => {
  if (user.role === "admin" || user.role === "manager") return;
  throw new UnAuthenticatedError("Not authorized to access this route");
};
