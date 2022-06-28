require("dotenv").config();
const express = require("express");
const app = express();
const { create } = require("express-handlebars");
const expressFileUpload = require("express-fileupload");
const { getUsuarios, loginUsuario, actualizar, borrar, insertar, setUsuarioStatus, eliminaImagen } = require("./consultas")
const jwt = require("jsonwebtoken");
const auth = require("./middleware/auth");
const session = require("express-session");
const { v4: uuidv4 } = require('uuid');
const { fs } = require("fs");

app.listen(3000, console.log("Servidor corriendo en http://localhost:3000/"));

//middleware
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
//app.use("/bootstrap",express.static(__dirname + "/node_modules/bootstrap/dist"));
//app.use("/jquery", express.static(__dirname + "/node_modules/jquery/dist"));
app.use("/assets", express.static(__dirname + "/public/assets"));

app.use(
  expressFileUpload({
    limits: 10000000,
    abortOnLimit: true,
    responseOnLimit:
      "El tamaño la imagen ha superado el limite permitido (10mb)",
  })
);


const hbs = create({
  partialDir: ["views/partials"]
});

app.use(session({
  secret: "123456",
  resave: false,
  saveUninitialized: true
}))

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
})

//configuracion de handlebars
app.engine("handlebars", hbs.engine);
app.set("view engine", "handlebars");
app.set("views", "./views");

//rutas - endpoints
app.get("/", (req, res) => {
  getUsuarios().then(respuesta => {
    res.render("index", {
      usuarios: respuesta
    });
  }).catch(error => {
    res.status(500).send({ code: 500, message: "Ha ocurrido un error al traer los datos" })
  })
});



app.post('/ingreso', (req, res) => { // Ingreso de datos de nuevo usuario
  try {
    const { imagen } = req.files;
    const { mail, nombre, password, password2, anosExperiencia, especialidad } = req.body;
    let id_imagen = uuidv4().slice(30);
    // console.log(imagen.mimetype);
    // console.log(mail, nombre, password, password2, anosExperiencia, especialidad, id_imagen);
    if ((mail == "") || (nombre == "") || (password == "") || (password2 == "") || (anosExperiencia == "") || (especialidad == "")) {
      res.send(`<h2>Ha ocurrido un error en los valores a ingresar</h2>
      <br>
      <h3>Por favor vuelva a ingresar valores validos.</h3>
      <br>
      <form action="/registro">
      <input type="submit" value="Presione para Volver" />
      </form>
      `)
    } else {
      if (password === password2) {
        
        imagen.mv(`${__dirname}/public/assets/img/${id_imagen}.jpg`, (err) => {
          if (err) {
            res.send(`Ha ocurrido un error al intentar subir la imagen.
                  <br>
                  <form action="/">
                  <input type="submit" value="Presione para Volver" />
                  </form>
                  `)
          } else {

            let datos = [mail, nombre, password, anosExperiencia, especialidad, id_imagen];
            // console.log(datos);
            insertar(datos)
              .then(resultado => res.redirect('/'))
              .catch(error => res.status(500).send({ code: 500, message: 'Ha ocurrido un error al crear un nuevo usuario en la DB' }))

            //res.sendFile(__dirname + "/collage.html")
          }
        })


      } else {
        res.send(`<h2>Ha ocurrido un error las claves no son iguales</h2>
      <br>
      <h3>Por favor vuelva a ingresar valores validos.</h3>
      <br>
      <form action="/registro">
      <input type="submit" value="Presione para Volver" />
      </form>
      `)
      }
    }
  } catch (err) {
    res.send(`
    <div class="py-4">
    <h1>${err}</h1>
      <h3>Ha ocurrido ${err} presione el boton para volver a ejecutar la accion.</h3>
      {{fecha}}
      <br><br>
      <form action="/">
      <input type="submit" value="Presione para Volver" />
      </form>
    </div>           
            `)
  }

});



app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {   // Aqui se encuentran los end point para ser colocados principalmente en la barra de navegacion

  const { email, password } = req.body;

  loginUsuario([email, password]).then(skater => {
    const token = jwt.sign(skater, process.env.SECRET_PASSWORD)
    // console.log(token);
    req.session.email = skater.email;
    req.session.nombre = skater.nombre;
    req.session.estado = skater.estado;
    req.session.token = token;
    res.send({ token: token });
  }).catch(error => {
    res.status(500).send({ code: 500, message: "Ha ocurrido un error al traer los datos" })
  })

});

app.get("/registro", (req, res) => {
  res.render("registro");
});

app.get("/datos", auth, (req, res) => {
  //console.log(req.body.usuario)
  let usuario = req.body.usuario;
  res.render("datos", {
    skater: usuario
  });
});

app.put("/datos", (req, res) => { // PUT para actualizar los datos de los usuarios ingresados
  // console.log("Ingrese al put");
  let { mail, nombre, password, anoExperiencia, especialidad } = req.body;
  let datos = [mail, nombre, password, anoExperiencia, especialidad];
  // console.log(datos)
  actualizar(datos)
    .then(resultado => res.send(resultado))
    .catch(error => res.status(500).send({ code: 500, message: 'Ha ocurrido un error al crear un nuevo curso en la DB' }))
})

app.delete("/datos/:id/:img", (req, res) => {
  let id = req.params.id;
  let img = req.params.img;
  
  borrar(id)
    .then(resultado => {
      eliminaImagen(img);
      res.send(resultado);
    })
    .catch(error => res.status(500).send({ code: 500, message: 'Ha ocurrido un error al crear un nuevo curso en la DB' }))
  console.log(id);

})

// RUTA QUE CAMBIA ESTADO DEL USUARIO DESDE ADMIN
app.put('/admin', async (req, res) => {
  const { id, estado } = req.body;
  // console.log(id, estado);
  try {
    const usuario = await setUsuarioStatus(id, estado);
    res.status(200).send(usuario);
  } catch (e) {
    res.status(500).send({
      error: `Algo salió mal... ${e}`,
      code: 500
    })
  }
})

app.get("/admin", auth, async (req, res) => { // Ingreso y validacion del admin primero valido el Token
  let usur = req.body.usuario;
  if (usur.estado) {  // valido si es administrador
    try {
      const usuarios = await getUsuarios();
      res.render("admin", { usuarios });
    } catch (error) {
      res.status(500).send({ error: `Algo salio mal ${error}`, code: 500 })
    }
  } else {
    res.status(403).render("error")
  }

});


/* app.get("/admin", (req, res) => {
  res.render("admin");
}); */

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});






app.all("*", (req, res) => {
  res.send("ruta no existe");
})

