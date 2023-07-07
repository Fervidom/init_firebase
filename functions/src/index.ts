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
import * as functions from 'firebase-functions';
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

// ADVANCED PROGRAMMING WITH JS PROMISES FOR CLOUD FUNCTIONS FOR FIREBASE

export const getBostonAreaWeather =
onRequest((request, response) => {
  // obtener el documento deseado. El metodo get: regresa una promesa.
  admin.firestore().doc('areas/grater-bostos').get()
  .then(areaSnapshot => {
    // convertir el snapshot en un objeto JS y acceder a las ciudades
    // array de ids de ciudades
    const cities = areaSnapshot.data()!.cities
    // crear arreglo de promesas
    const promises = [];
    // iterar el arreglo 
    for(const city in cities){
      // construir una referencia a cada ciudad que necesito leer
      // cada una de estas llamadas regresa una promesa
      // debemos esperar a que cada una termine y luego obtener esos datos
      // para enviarlos al cliente. 
      const p = admin.firestore().doc(`cities-weather/${city}`).get()
      promises.push(p);
    }
    // creamos una nueva promesa que se cumplira cuando todas las de adentro del array se cumplan.
    return Promise.all(promises)
  })
  .then(citySnapshots => {
    const results = [];
    citySnapshots.forEach(citySnap => {
      const data = citySnap.data();
      data.city = citySnap.id
      results.push(data);
    })
    response.send(results);
  })
  .catch(error => {
    console.log(error);
    response.status(500).send(error);
  })
}); 

// Async and Await how do they work

/* async: para declarar una funcion que siempre regresa una promesa, que se debe resolver
cuando el trabajo del background este completo 
await: para pausar la ejecución de una funcion async hasta que otras promesas con completadas
o rechazadas. */

export const getBostonWeatherRefactor = onRequest( async (request, response) => {
  try {
    const  snapshot = await admin.firestore().doc("cities.weather/boston-ma-us").get()
    const data = snapshot.data();
    response.send(data);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
  /* con el refactor nos deshicimos de los bloques de codigo que usaban .then*/
});

// onBostonWeatherUpdate  no es necesario refactorizarla pues async y await no haria diferencia
// ya que no usamos los resultados de la ultima promesa usada.

export const getBostonAreaWeatherRefactor =
onRequest( async (request, response) => {
  try {
    const areaSnapshot = await admin.firestore().doc('areas/grater-bostos').get();
    const cities = areaSnapshot.data()!.cities
    const promises = [];
    for(const city in cities){
      const p = admin.firestore().doc(`cities-weather/${city}`).get()
      promises.push(p);
    }
    const citySnapshots = await Promise.all(promises)
    const results = [];
    citySnapshots.forEach(citySnap => {
      const data = citySnap.data();
      data.city = citySnap.id
      results.push(data);
    })
    response.send(results);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
}); 

// TRIGGER onCreate
export const onMessageCreate = functions.database
// usaremos ref para decirle que responda todos los cambios en esa ruta. 
// los que estan dentro de {}, haran match con cualquier nodo child en la ruta. COMODINES
.ref('/rooms/{roomId}/messages/{messageId}')
// ya que este es codigo a ejecutarse siempre que se crea un nuevo nodo usaremos oncreate trigger
.onCreate( async (snapshot, context) => {
  // el objeto context contiene propiedades con el mismo nombre que los comodines de las {} 
  const roomId = context.params.roomId;
  const messageId = context.params.messageId;
  console.log(`New message ${messageId} in room ${roomId}`);

  // para obtener los datos, de la base de datos, que se agregaron a esta ubicación, usar obeto snapshot
  // tiene un metodo llamado val que tiene una copia de los datos raw como un objeto de JS
  // val tendra los mismos nombres de propiedades que la base.
  const messageData = snapshot.val();
  const text = addPizzazz(messageData.text);

  /* ya que tenemos el nuevo texto, lo escribiremos de vuelta en la base de datos
   usaremos el objeto snapshot y ref, que es un objeto de tipo referencia y tiene acceso administrador a la base de datos
   señala la ubicación emparejada por el patron dado el metodo ref en la definición de la funcion 
   '/rooms/{roomId}/messages/{messageId}'.
   Puedes usarlo para leer y escribir la base de datos en esa ubicación o construir mas referencias a otras ubicaciones.*/

   /*usamos el metodo update al que le pasamos un objeto con los children que queremos actualizar. Es un metodo asincrono.
    agregamos el return para indicar que es lo ultimo a hacer regresar la promesa siguiendo la regla, esto esperara hasta 
    que la promesa se resuelva*/

  // cambiamos a await en lugar de return. para pausar el codigo hasta que la actualización se complete.
  await  snapshot.ref.update({ text: text })
  
  /* construimos una referencia a la locacion de contador en la base de datos. que apuntara a la locacion del nodo 
  que fue creado -> snapshot.ref. Despues nos vamos dos nodos arriba en el arbol usando la propiedad parent de la referencia. Es decir
  la referencia apunta a /rooms/{roomId} -> snapshot.ref.parent?.parent.
  Despues necesitamos el conteo de mensajes child debajo de esta location. Usamos el metodo child*/
  const countRef = snapshot.ref.parent?.parent?.child('messageCount');
  /* El valor referenciado en countRef es lo que quiero leer incrementar y escribir.
  Usaremos el metodo transaction para hacer esa transacción. requiere una funcion de actualización.*/
  return countRef?.transaction(count => {
    return count + 1; 
  });
})

function addPizzazz(text: string): string{
  return text.replace(/\bpizza\b/g,'🍕')
}

// TRIGGER onUpdate
/* Es similar al anterior pero tiene un objeto change en lugar de snapshot. Ambos objetos estan parametrizados de tipo
DataSnapShot*/
export const onMessageEdit = functions.database
.ref('/rooms/{roomId}/messages/{messageId}')
.onUpdate((change, context) => {
  /* Con update debemos tener cuidado, pues actualizar el documento al final, puede hacer que el disparador se vuelva 
  a lanzar creando un ciclo infinito que puede costar mucho dinero. */ 
  /* Para manejar esto, necesitamos comparar el message text en los snapshots de before y after.*/
  
  // obtenemos el objeto despues de su actualizacion
  const before = change.before.val( )
  // obtenemos el objeto despues de su actualizacion
  const after = change.after.val();

  /* comparemos si el text fue cambiado o tiene un cambio.
   Si los textos son iguales, no hay cambio por lo cual no debemos hacer nada mas que salir de la funcion
   retornando un null. */
  if(before.text == after.text){
    console.log('Text didnt change | el texto no cambio');
    return null
  }

  // transformamos en una constante usando la funcion anterior 
  const text = addPizzazz(after.text);
  // agregaremos la fecha tambien.
  const timeEdited = Date.now();
  // usamos ref del after para escribir en la base de datos
  return change.after.ref.update({text, timeEdited});
  // agregamos el return a la promise desde la funcion. Asi cloud functions esperara a que todo termine antes de hacer un cleaning up.
})

// TRIGGER onDelete
export const onMessageDelete = functions.database
.ref('/rooms/{roomId}/messages/{messageId}')
.onDelete( async (snapshot, context) => {
  const countRef = snapshot.ref.parent?.parent?.child('messageCount');
  return countRef?.transaction(count => {
    return count - 1; 
  });
})

// este es un comentario para comprobar el sign en los commits.
// al usar una propiedad de objeto que en firebase es tipo REFERENCE,
// se debe usar la propiedad path para tomarlo como string y usarlo
// p.e. "prop_ref" + propertyShown.prop_ref.path
// al imprimir eso obtendremos "properties/iddelapropiedad"
// de lo contrario, si no usamos .path obtendremos Object object y 
// ese objeto no se puede usar como string.
// actualizar indexes de firebase con cada filtro.
