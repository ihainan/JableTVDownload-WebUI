# JableTV Download WebUI

JableTV Download WebUI is a user-friendly web interface for downloading videos from [jable.tv](https://jable.tv/). This project is built on top of [hcjohn463's JableTVDownload project](https://github.com/hcjohn463/JableTVDownload). 

![screenshot](https://imgur.ihainan.me/iklsV6P.png)

## Installation

- Clone this repository: 

``` bash
git clone --recurse-submodules git@github.com:ihainan/JableTVDownload-WebUI.git
```

- Modify the docker-compose.yml file:
    - Create two folders for downloaded videos and database file.
    - Change `./downloads` to the folder path where you want to save downloaded videos.
    - Change `./db` to the folder path where you want to save the database file.
- Start the Docker services: 

``` bash
docker-compose up -d --build
```
- Access the web interface by navigating to http://<ip_address>:41056 in your web browser.

## Acknowledgments

Special thanks to [hcjohn463](https://github.com/hcjohn463) for the [original JableTVDownload project](https://github.com/hcjohn463/JableTVDownload/tree/main), which serves as the foundation for this project.




