const jwt = require("jsonwebtoken");

const verificarToken = (req, res, next) => {

    const token = req.body.token || req.query.token || req.headers["x-access-token"] || req.headers["authorization"];

    if(!token){
        return res.status(403).render("error")
    }else {
        try {
            const decoded = jwt.verify(token, process.env.SECRET_PASSWORD);
            req.body.usuario = decoded;
            return next();
            
        } catch (error) {
            return res.status(401).send({code: 401, message: "Token no válido, se le ha negado el acceso"})
        }
    }

}

module.exports = verificarToken;