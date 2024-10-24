const passport = require("passport");
const { ExtractJwt, Strategy } = require("passport-jwt");
const Users = require("../db/models/Users");
const UserRoles = require("../db/models/UserRoles");
const RolePrivileges = require("../db/models/RolePrivileges");
const role_privileges = require("../config/role_privileges");
const config = require("../config");
const Response = require("./Response");
const { HTTP_CODES } = require("../config/Enum");
const CustomError = require("./Error");
module.exports = () => {
  let strategy = new Strategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.JWT.SECRET,
    },
    async (payload, done) => {
      try {
        let user = await Users.findById(payload.id);
        if (user) {
          let userRoles = await UserRoles.find({ user_id: payload.id });
          let rolePrivileges = await RolePrivileges.find({
            role_id: { $in: userRoles.map((ur) => ur.role_id) },
          });

          let privileges = rolePrivileges.map((rp) =>
            role_privileges.privileges.find((p) => p.key === rp.permission)
          );
          done(null, {
            id: user._id,
            roles: privileges,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            exp: Math.floor(Date.now() / 1000) * config.JWT.EXPIRE_TIME,
          });
        } else {
          done(new Error("User not found"), null);
        }
      } catch (err) {
        done(err, null);
      }
    }
  );

  passport.use(strategy);
  return {
    initialize: function () {
      return passport.initialize();
    },
    authenticate: function () {
      return passport.authenticate("jwt", { session: false });
    },
    checkRoles: (...expectedRoles) => {
      return (req, res, next) => {
        let i = 0;
        let privileges = req.user.roles.map((rp) => rp.key);

        while (
          i < expectedRoles.length &&
          !privileges.includes(expectedRoles[i])
        )
          i++;
        if (i >= expectedRoles.length) {
          //error
          let response = Response.errorResponse(
            new CustomError(
              HTTP_CODES.UNAUTHORIZED,
              "Unauthorized",
              "Need Permission"
            )
          );
          return res.status(response.code).json(response);
        }
        return next(); //authorized
      };
    },
  };
};
