/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as admin from 'firebase-admin';
import { document } from "firebase-functions/v1/firestore";
// el sdk de admin necesita ser inicializado primero.
// se usa para obtener los documentos que queremos.
admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript


export const getBostonWeather = onRequest((request, response) => {
  // Obtener el snapshot del documento del clima de Boston
  admin.firestore().doc("cities.weather/boston-ma-us").get()
  // las promesas tienen un metodo llamado then, permite que tu codigo siga al
  // cumplirse la promesa con los resultados del trabajo que acaba de terminar.
  .then((snapshot) => {
    // tomamos el snapshot y lo convertimos en un objeto de javascript.
    const data = snapshot.data();
    // y con eso, enviaremos su representación al cliente.
    response.send(data);
    // el objeto de respuesta sabe como convertir el objeto en JSON
    // esta llamada para enviar la respuesta, termina la función.
    //Que pasa si esta promesa es rechazada con un error?

  })// atraparemos lo que sea que salga mal con el metodo get de firestore
  .catch((error) => {
    // handle error
    // mostramos el error
    console.log(error);
    // enviamos esa respuesta de error al cliente.
    response.status(500).send(error);
  })
});

// Learn javascript promises with firestore trigger
/* se debe mostrar una promesa que se convierte en cumplida o rechazada
cuando concluye todo el trabajo pendiente de esa función
eso le hace saber a CF el momento mas seguro para limpiar la invocación
de la función y continuar con la siguiente.  */

// funcion que se activa siempre que ese documento se actualice con datos nuevos.
export const onBostonWeatherUpdate = 
    document("cities-weather/boston-ma-us").onUpdate(change => {
        // el parametro change, describe la actualización
        // tiene dos propiedades: before y after.

        /* obtenemos los contenidos del documento despues del cambio.
        la propiedad after es un snapshot del documento con los contenidos
        actualizados de ese documento.
        Usamos el metodo data para convertirlo a un objeto javascript */
        const after = change.after.data()
        // contruimos un objeto payload
        const payload = {
            data: {
                temp: String(after.temp),
                conditions: after.conditions
            }
        }
        /* usamos el admin para notificar y lo retornamos.
         ya que sendToTopic devuelve una promesa y lo estamos retornando
         cumplimos la condición de terminar la función con una promesa. */
        return admin.messaging().sendToTopic("weather-boston-ma-us", payload)
        .catch((error) => {
            console.log("FMC failed", error);
        })
        /* no es necesario el catch porque CF ya detectará si falla la promesa
        del sendToTopic*/
        
    })
    