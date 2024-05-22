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
git init
git add .
git reset
make dev.remove-containers dev.pull.lms dev.up.lms
make dev.logs.lms
ls
cd ..
ls
cd ubuntu
cd devstack
ls
make dev.remove-containers dev.pull.lms dev.up.lms
ls
make dev.logs.lms
cd ..
ls
cd edx-platform
ls
cd lms
ls
cd ..
git init
cd ..
ls
cd ubuntu
cd devstack
ls
cd ..
ls
git remote set-url origin https://github.com/bregoNMI/HALO_LMS.git
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/bregoNMI/HALO_LMS.git
git push -u origin master
git push -u origin master
mkdir course-discovery
git rm --cached course-discovery
git rm --cached credentials
git rm --cached cs_comments_service
git rm --cached devstack
rm ecommerce
git rm --cached ecommerce
git rm --cached edx-analytics-dashboard
git rm --cached edx-analytics-data-api
git rm --cached edx-notes-api
git rm --cached edx-platform
git rm --cached frontend-app-account
git rm --cached frontend-app-authn
git rm --cached frontend-app-course-authoring
git rm --cached frontend-app-gradebook
git rm --cached frontend-app-learner-dashboard
git rm --cached frontend-app-learner-record
git rm --cached frontend-app-learning
git rm --cached frontend-app-library-authoring
git rm --cached frontend-app-ora-grading
git rm --cached frontend-app-payment
git rm --cached frontend-app-profile
git rm --cached frontend-app-program-console
git rm --cached frontend-app-publisher
git rm --cached registrar
git rm --cached xqueue
