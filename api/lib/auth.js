const passport = require("passport");
const { ExtractJwt, Strategy } = require("passport-jwt");
const Users = require("../db/models/Users");
const UserRoles = require("../db/models/UserRoles");
const RolePrivileges = require("../db/models/RolePrivileges");

const config = require("../config");

module.exports = () => {
  let strategy = new Strategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.JWT.SECRET,
    },
    async (payload, done) => {
      try {
        let user = await Users.findById(payload.id);
        if (!user) {
          let userRoles = await UserRoles.find({ user_id: payload.id });
          let rolePrivileges = await RolePrivileges.find({
            role_id: { $in: userRoles.map((ur) => ur.role_id) },
          });
          done(null, {
            id: user._id,
            roles: rolePrivileges,
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
    initialize: () => {
      return passport.initialize();
    },
    authenticate: () => {
      return passport.authenticate("jwt", { session: false });
    },
  };
};
