let generateFiles = require('./generateFiles');
let k8s = require('k8s');

function k8sAPI(IP,PORT){
   
    if(
        typeof IP !== 'string'  ||
        typeof PORT !== 'string'||
        IP.trim() === ''        ||
        PORT.trim() === ''
    ){
        console.error('please provide IP and PORT as strings');
        return undefined;
    }

    let kubectl = k8s.kubectl({
        endpoint:  `https://${IP}:${PORT}`,
        binary: '/usr/local/bin/kubectl'
    });

    let API = {};
    let successCount = 0;

    API.createNamespace = function createNamespace(namespace){

        if(!kubectl){
            console.error('pleas call API.init first');
            return false;
        }

        function successPromise(data){
            console.log('Success! creating...');
            successCount++;
            if(successCount == 9){
                console.log('Finish creating Files');
                console.log('your namespace is ready');
                return true;
            }
        }
        
        function failerPromise(error){
            console.log('Failed!... maybe the namespace is already created');
            console.log('Error:');
            console.error(error);
            console.log('-------------------');
        }
        
        generateFiles(namespace);
        let basePath = `${__dirname}/namespaces/${namespace}/`;

        //creat new namespace
        kubectl
        .command(`create namespace ${namespace}`)
        .then(successPromise, failerPromise);
        
        kubectl
        .command(`create -f ${basePath}001-local-volumes.yaml`)
        .then(successPromise, failerPromise);

        kubectl
        .command(`create -f ${basePath}002-mysql-credentials.yaml`)
        .then(successPromise, failerPromise);

        kubectl
        .command(`create -f ${basePath}003-mysql/001-mysql-volume.yaml`)
        .then(successPromise, failerPromise);
        
        kubectl
        .command(`create -f ${basePath}003-mysql/002-mysql-deployment.yaml`)
        .then(successPromise, failerPromise);

        kubectl
        .command(`create -f ${basePath}003-mysql/003-mysql-service.yaml`)
        .then(successPromise, failerPromise);

        kubectl
        .command(`create -f ${basePath}004-wordpress/001-wordpress-volume.yaml`)
        .then(successPromise, failerPromise);

        kubectl
        .command(`create -f ${basePath}004-wordpress/002-wordpress-deployment.yaml`)
        .then(successPromise, failerPromise);

        kubectl
        .command(`create -f ${basePath}004-wordpress/003-wordpress-service.yaml`)
        .then(successPromise, failerPromise);    
        
    }

    API.getUserIP = function getUserIP(namespace){
      
        let userKubectl = k8s.kubectl({
            endpoint:  `https://${IP}:${PORT}`,
            namespace: `${namespace}`,
            binary: '/usr/local/bin/kubectl'
        });

        userKubectl.service.list(function(error, serviceInfo){
            if(error){
                console.error('failed getting user IP');
                return '';
            }

            //return the Service ip for the user
            let userIP = IP;
            let userPort = serviceInfo.items[1].spec.ports[0].nodePort;
            return `${userIP}:${userPort}`;
        });
    }   

    API.getServiceNames = function getServiceNames(namespace){
        
        let userKubectl = k8s.kubectl({
            endpoint:  `https://${IP}:${PORT}`,
            namespace: `${namespace}`,
            binary: '/usr/local/bin/kubectl'
        });

        userKubectl.service.list(function(error, serviceInfo){
            if(error){
                console.error('failed getting services names');
                return undefined;
            }

            //return the service name
            console.log(`mysql service name:     ${serviceInfo.items[0].metadata.name}`)
            console.log(`wordpress service name: ${serviceInfo.items[1].metadata.name}`)
            return {
                mysqlService: `${serviceInfo.items[0].metadata.name}`,
                wordpressService: `${serviceInfo.items[1].metadata.name}`
            }
        });
    }
    
    API.getContainerInfo = function getContainerInfo(namespace){
        
        let userKubectl = k8s.kubectl({
            endpoint:  `https://${IP}:${PORT}`,
            namespace: `${namespace}`,
            binary: '/usr/local/bin/kubectl'
        });

        // //print pods containers names and their restart counts
        userKubectl.pod.list(function(error, podsInfo){
            
            let resultArray = [];

            if(error){
                console.error('failed getting container info');
                return undefined;
            }

            for(let i=0; i < podsInfo.items.length; i++){
                
                let containerName = podsInfo.items[i].metadata.generateName;
                let restarts = podsInfo.items[i].status.containerStatuses[0].restartCount;
                let status = podsInfo.items[i].status.phase;
                
                let resultObject = {
                    containerName,
                    restarts,
                    status
                }
                resultArray.push(resultObject);

                console.log(`container name:  ${containerName} 
                             restarts:        ${restarts}
                             status:          ${status}
                            `)
            }

            return resultArray;
        }) 

    }

    API.getAutoscalerInfo = function getAutoscalerInfo(namespace){
        
        let userKubectl = k8s.kubectl({
            endpoint:  `https://${IP}:${PORT}`,
            namespace: `${namespace}`,
            binary: '/usr/local/bin/kubectl'
        });

        userKubectl
        .command('get hpa')
        .then(function(data){

            let extractedData = data.split('\n')[1].split(' ').filter((item) => item.length > 0);

            let hpaInfo = {
                name: extractedData[0],
                refernce: extractedData[1],
                load: extractedData[5],
                targets: `${extractedData[2]} ${extractedData[3]} ${extractedData[4]} ${extractedData[5]} ${extractedData[6]} ${extractedData[7]}`,
                minpods: extractedData[8],
                maxpods: extractedData[9],
                replicas: extractedData[10],
                age: extractedData[11]
            }

            console.log(`
                        replicas: ${hpaInfo.replicas}
                        loads:    ${hpaInfo.load}
                        targets:  ${hpaInfo.targets}
                        `);

            return hpaInfo;
        })
        .catch((error)=>{
            console.error('Failed to get HPA info!');
            console.error(error);
            return undefined;
        });
    }
    
    return API;
}

module.exports = k8sAPI;

// let kubectl = k8s.kubectl({
//     endpoint:  'https://192.168.42.22:8443',
//     binary: '/usr/local/bin/kubectl'
// });





// let kubectl2 = k8s.kubectl({
//     endpoint:  'https://192.168.42.22:8443',
//     namespace: `${namespace}`,
//     binary: '/usr/local/bin/kubectl'
// });

// // //print hpa horizontall pod autosaler info
// // kubectl2
// // .command('get hpa')
// // .then(function(data){

// //     let extractedData = data.split('\n')[1].split(' ').filter((item) => item.length > 0);

// //     let hpaInfo = {
// //         name: extractedData[0],
// //         refernce: extractedData[1],
// //         load: extractedData[5],
// //         targets: `${extractedData[2]} ${extractedData[3]} ${extractedData[4]} ${extractedData[5]} ${extractedData[6]} ${extractedData[7]}`,
// //         minpods: extractedData[8],
// //         maxpods: extractedData[9],
// //         replicas: extractedData[10],
// //         age: extractedData[11]
// //     }

// //     console.log(`
// //                  replicas: ${hpaInfo.replicas}
// //                  loads:    ${hpaInfo.load}
// //                  targets:  ${hpaInfo.targets}
// //                 `)

// // })
// // .catch(failerPromise);


// // kubectl2.service.list(function(err, serviceInfo){
// //     //return the Service ip for the user
// //     console.log(`192.168.42.22/${serviceInfo.items[1].spec.ports[0].nodePort}`);

// //     //return the service name
// //     console.log(`mysql service name:     ${serviceInfo.items[0].metadata.name}`)
// //     console.log(`wordpress service name: ${serviceInfo.items[1].metadata.name}`)
// // });


// // //print pods containers names and their restart counts
// // kubectl2.pod.list(function(err, podsInfo){

// //     for(let i=0; i< podsInfo.items.length; i++)
// //         console.log(`container name: ${podsInfo.items[i].metadata.generateName} 
// //                      restart:        ${podsInfo.items[i].status.containerStatuses[0].restartCount}
// //                      status:         ${podsInfo.items[i].status.phase}
// //                      `)
// // }) 

// /*

// */