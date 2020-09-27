set -e

#COMMIT_SHA1=$CIRCLE_SHA1
COMMIT_SHA1=${TRAVIS_COMMIT::6}
# We must export it so it's available for envsubst
export COMMIT_SHA1=$COMMIT_SHA1

envsubst <./.kube/deploy.yml >./.kube/deploy.yml.out
mv ./.kube/deploy.yml.out ./.kube/deploy.yml

envsubst <./.kube/service.yml >./.kube/service.yml.out
mv ./.kube/service.yml.out ./.kube/service.yml


envsubst <./.kube/redis.yml >./.kube/redis.yml.out
mv ./.kube/redis.yml.out ./.kube/redis.yml

envsubst <./.kube/redis-svc.yml >./.kube/redis-svc.yml.out
mv ./.kube/redis-svc.yml.out ./.kube/redis-svc.yml

echo "$KUBERNETES_CLUSTER_CERTIFICATE" | base64 --decode > cert.crt

./kubectl \
  --kubeconfig=/dev/null \
  --server=$KUBERNETES_SERVER \
  --certificate-authority=cert.crt \
  --token=$KUBERNETES_TOKEN \
  apply -f ./.kube/
