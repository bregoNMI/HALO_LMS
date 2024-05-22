ls
git clone https://github.com/openedx-unsupported/devstack.git
ls
cd devstack
ls
make
sudo apt install make        # version 4.3-4.1build1, or
python
py
python3
docker
sudo snap install docker
docker compose
make dev.clone
sudo make dev.clone
make dev.clone.https
docker run hello-world
ls -l /var/run/docker.sock
sudo chmod 666 /var/run/docker.sock
docker run hello-world
make dev.pull.large-and-slow
cd devstack
ls
make dev.pull.large-and-slow
sudo usermod -aG docker ubuntu
sudo chown root:docker /var/run/docker.sock
make dev.pull.large-and-slow.https
make dev.provision
permission denied while trying to connect to the Docker daemon socket at unix:///var/run/docker.sock: Get "http://%2Fvar%2Frun%2Fdocker.sock/v1.24/containers/json?all=1&filters=%7B%22label%22%3A%7B%22com.docker.compose.config-hash%22%3Atrue%2C%22com.docker.compose.project%3Ddevstack%22%3Atrue%7D%7D": dial unix /var/run/docker.sock: connect: permission denied
make[1]: *** [Makefile:216: impl-dev.provision] Error 1
make[1]: Leaving directory '/home/ubuntu/devstack'
Would you like to assist devstack development by sending anonymous usage metrics to edX? Run `make metrics-opt-in` to learn more!
sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker
cd devstack
make dev.provision
cd devstack
make dev.up.large-and-slow
ls
