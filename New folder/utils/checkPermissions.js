import { UnAuthenticatedError } from "../errors/index.js";

const checkPermissions = (user) => {
  if (user.role === "admin") return;
  throw new UnAuthenticatedError("Not authorized to access this route");
};

export default checkPermissions;
