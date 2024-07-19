FROM python:3.11.2-alpine3.17

WORKDIR /app
RUN chmod -R 777 /app

# download dependencies
# RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk update 
# RUN apk add build-base
RUN apk add ffmpeg
RUN apk add chromium
RUN apk add chromium-chromedriver
RUN apk add bash

# create directories
RUN mkdir -p downloads

# copy folders and files
ADD JableTVDownload JableTVDownload

# update the Python scripts
RUN sed -i "s|url = input('輸入jable網址:')|url = input('輸入jable網址:\\\n')|" JableTVDownload/main.py
RUN sed -i "s|action = input('要轉檔嗎?\[y/n\]')|action = input('要轉檔嗎?\[y/n\]\\\n')|" JableTVDownload/download.py
RUN sed -i "s|action = input('選擇轉檔方案\[1:僅轉換格式(默認,推薦) 2:NVIDIA GPU 轉檔 3:CPU 轉檔\]')|action = input('選擇轉檔方案\[1:僅轉換格式(默認,推薦) 2:NVIDIA GPU 轉檔 3:CPU 轉檔\]\\\n')|" JableTVDownload/download.py
RUN sed -i "s|end='', flush=True|end='\\\n', flush=True|" JableTVDownload/crawler.py

# pip
# RUN pip install --upgrade pip --index-url https://mirrors.sustech.edu.cn/pypi/web/simple
# RUN pip config set global.index-url https://mirrors.sustech.edu.cn/pypi/web/simple
RUN pip install -r /app/JableTVDownload/requirements.txt
RUN pip install -U pycryptodome

# install node
RUN apk add nodejs npm
RUN mkdir server
RUN mkdir server/db
ADD server/server.js server/
ADD server/package.json server/
RUN cd server && npm install

# copy scripts
ADD scripts scripts

CMD [ "node", "/app/server/server.js" ]