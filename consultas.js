const { Pool } = require("pg");
//const { v4: uuidv4 } = require('uuid');
const fs = require('fs');



const pool = new Pool({
    user: process.env.USER,
    host: process.env.HOST,
    password: process.env.PASSWORD_DB,
    database: process.env.DATABASE,
    port: process.env.PORT_DB
});


const getUsuarios = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const result = await pool.query("SELECT * FROM skaters Order BY Id ASC");
            resolve(result.rows)
        } catch (error) {
            console.log(error)
            reject(error);
        }
    })
}

const loginUsuario = (datos) => {
    //console.log(datos);
    return new Promise(async (resolve, reject) => {
        try {
            const consulta = {
                text: "SELECT id, email, nombre,password, anos_experiencia, especialidad, foto, estado, administrador FROM skaters WHERE email = $1 AND password = $2",
                values: datos
            }
            const result = await pool.query(consulta);
            // console.table(result.rows)
            if (result.rows.length == 0) {
                reject("usuario no encontrado")
            } else {
                resolve(result.rows[0])
            }
        } catch (error) {
            console.log(error)
            reject(error);
        }
    })
}

const insertar = (datos) => {
    //console.log(datos);
    return new Promise(async (resolve, reject) => {
        const consulta = {
            text: "INSERT INTO skaters (email, nombre, password, anos_experiencia, especialidad, foto, estado, administrador) VALUES ($1, $2, $3, $4, $5, $6, false, false) RETURNING*;",
            values: datos

        }
        try {
            const result = await pool.query(consulta);
            // console.log(result);
            resolve(result.rows[0])
        } catch (error) {
            console.log(error);
            reject(error)
        }
    })
}

const actualizar = (datos) => {
    return new Promise(async (resolve, reject) => {
        //mail, nombre, password, anoExperiencia, especialidad
        const consulta = {
            text: " UPDATE skaters SET nombre=$2, password=$3, anos_experiencia=$4, especialidad=$5  WHERE email= $1 RETURNING *",
            values: datos
        }
        try {
            const result = await pool.query(consulta);
            resolve(result.rows[0])
        } catch (error) {
            reject(error)
        }
    })

}

const borrar = (id) => {
    return new Promise(async (resolve, reject) => {
        const consulta = {
            text: "DELETE FROM skaters WHERE id =$1 RETURNING *",
            values: [id]
        }
        try {
            
            const result = await pool.query(consulta);
            
            resolve(result.rows[0])
        } catch (error) {
            reject(error)
        }
    })

}




async function setUsuarioStatus(id, estado) {
    const result = await pool.query(
        `UPDATE skaters SET estado = NOT estado WHERE id = ${id} RETURNING *`
    )
    const usuario = result.rows[0];
    return usuario;
};


function eliminaImagen(img){
    try {
        fs.unlinkSync(`./public/assets/img/${img}.jpg`)
        console.log('imagen borrada')
      } catch(err) {
        console.error('Something wrong happened removing the file', err)
      }
}

module.exports = { getUsuarios, loginUsuario, insertar, actualizar, borrar, setUsuarioStatus, eliminaImagen }
