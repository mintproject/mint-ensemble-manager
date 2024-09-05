import * as k8s from "@kubernetes/client-node";
import { WriteStream } from "fs";
import * as stream from 'stream';


const kc = new k8s.KubeConfig();

// FIXME: Should this be loaded from MINT config ?
kc.loadFromDefault();

const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
const batchV1Api = kc.makeApiClient(k8s.BatchV1Api);
const k8sLogApi = new k8s.Log(kc);

function get_volumes_and_mounts(folderBindings, podname): [Array<k8s.V1Volume>, Array<k8s.V1VolumeMount>] {
    let volumes = []
    let mounts = []
    for(let i in folderBindings) {
        let fbindings = folderBindings[i];
        let fbinding_array = fbindings.split(":")
        let host_path = fbinding_array[0]
        let mount_path = fbinding_array[1]
        let volume_name = podname + "-volume-" + i
        volumes.push({
            name: volume_name,
            hostPath: {
                path: host_path
            }
        })
        mounts.push({
            name: volume_name,
            mountPath: mount_path
        })
    }
    return [volumes, mounts]   
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

export const runKubernetesPod = async(
    namespace: string,
    jobname: string,
    cmd: string[],
    image: string,
    logstream: WriteStream,
    workingDirectory: string,
    folderBindings: string[],
    cpu_limit:string = "200m",
    memory_limit:string = "2048Mi"
) => {
    let container_name = jobname + "-container";
    let [volumes, mounts] = get_volumes_and_mounts(folderBindings, jobname)

    // Create the Job
    const jobManifest = {
        apiVersion: 'batch/v1',
        kind: 'Job',
        metadata: {
            name: jobname
        },
        spec: {
            template: {
                spec: {
                    volumes: volumes,
                    containers: [
                        {
                            name: container_name,
                            image: image,
                            command: cmd,
                            workingDir: workingDirectory,
                            resources: {
                                limits: {
                                    cpu: cpu_limit, // Limit the CPU usage to cpu_limit millicores
                                    memory: memory_limit // Limit the memory usage to memory_limit MiB
                                },
                                requests: {
                                    cpu: "100m", // Request at least 100 millicores of CPU
                                    memory: "64Mi" // Request at least 64 MiB of memory
                                }
                            },
                            volumeMounts: mounts
                        }
                    ],
                    restartPolicy: "Never"
                }
            },
            backoffLimit: 0
        }
    }
    
    let statusCode = 0

    try {
        // Create Job
        await batchV1Api.createNamespacedJob(namespace, jobManifest);
        
        // Wait for a second, and check Pods for the Job
        await delay(1000)
        let jobpods = await k8sApi.listNamespacedPod(namespace, undefined, false, undefined, undefined, "job-name="+jobname)

        // Get Pod Name
        let podname = null;
        for(let i in jobpods.body.items) {
            let pod = jobpods.body.items[i]
            podname = pod.metadata.name
            break
        }

        if(podname != null) {
            // Create logstream to write pod log
            const pod_log_stream = new stream.PassThrough();
            pod_log_stream.on('data', (chunk) => {
                logstream.write(chunk);
            });
            let started_log = false

            let wait_for = 1000
            try {
                await delay(wait_for);

                // Wait until the Pod is finished (Failed or Succeeded)
                while(true) {
                    await delay(wait_for);

                    // Check the status of Pod
                    let res = await k8sApi.readNamespacedPodStatus(podname, namespace)
                    let status = res.body.status.phase

                    if(status != "Pending" && !started_log) {
                        // Start logging
                        await k8sLogApi.log(namespace, podname, container_name, pod_log_stream, {follow: true});
                        started_log = true
                    }
                    
                    if(status == "Running") {
                        // If it is still running, then we wait again (for a bit longer time time)
                        wait_for = wait_for * 2
                        if(wait_for > 60000) {
                            wait_for = 60000
                        }
                    }
                    else if(status == "Failed") {
                        statusCode = 1
                        break
                    }
                    else if(status == "Succeeded") {
                        statusCode = 0
                        break
                    }
                }

                // Pod is finished. Delete Pod
                await k8sApi.deleteNamespacedPod(podname, namespace)
            }
            catch (err2) {
                logstream.write("StatusCode 2: Error: " + err2)
                statusCode = 2
            }
        }
        else {
            logstream.write("StatusCode 4: Error: Could not find Pod for Job")
            statusCode = 4
        }
        
        // Job is finished, delete Job
        await batchV1Api.deleteNamespacedJob(jobname, namespace)

    } catch (err) {
        logstream.write("StatusCode 3: Error: Could not create Job "+err)
        statusCode = 3
    }
    // Return status code
    return statusCode
}
