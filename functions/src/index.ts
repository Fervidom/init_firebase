/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from 'firebase-admin';
//el sdk de admin necesita ser inicializado primero.
//se usa para obtener los documentos que queremos.
admin.initializeApp();

// Start writing functions
// https://firebase.google.com/docs/functions/typescript


export const getBostonWeather = onRequest((request, response) => {
    //Obtener el snapshot del documento del clima de Boston
  const promise = admin.firestore().doc('cities.weather/boston-ma-us').get()
  //las promesas tienen un metodo llamado then que permite que tu codigo siga despues de 
  //cumplirse la promesa con los resultados del trabajo que acaba de terminar.
  promise.then(snapshot => {
    //tomamos el snapshot y lo convertimos en un objeto de javascript.
    const data = snapshot.data();
    //y con eso, enviaremos su representación al cliente.
    response.send(data);
    //el objeto de respuesta sabe como convertir el objeto en JSON
    //esta llamada para enviar la respuesta, termina la función.
  })
});
