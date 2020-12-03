FROM ubuntu:18.04
# FROM amd64/debian:stretch-slim

ENV LC_ALL=C.UTF-8
ENV LANG=C.UTF-8

RUN apt-get update && \
    apt-get install -y \
    build-essential \
    gcc \
    git \
    libtool \
    automake \
    make \
    cmake \
    gtk-doc-tools \
    libffi6 libffi-dev \
    gobject-introspection \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    gstreamer1.0-libav \
    gstreamer1.0-nice \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-tools \
    gir1.2-gst-plugins-bad-1.0 \
    libcairo2-dev \
    libgirepository1.0-dev \
    pkg-config \
    python3-dev \
    python3-wheel \
    python3-gst-1.0 \
    python3-pip \
    python3-gi \
    python3-websockets \
    python3-psutil \
    python3-uvloop

RUN pip3 install pipenv sanic

COPY . /src
WORKDIR /src

RUN cd gst-WebRenderSrc && \
    cmake -DCMAKE_BUILD_TYPE=Release . && \
    CC=clang CXX=clang++ make -stdlib=g++ && \
    make install

RUN git clone --depth 1 https://github.com/RidgeRun/gst-interpipe.git && \
    cd gst-interpipe && \
    ./autogen.sh --libdir /usr/lib/x86_64-linux-gnu/gstreamer-1.0/ && \
    make && \
    make install

RUN pipenv install && \
    mkdir -p /usr/local/share/brave/output_images/

#ARG BRAVE_REPO=bitwave-tv
#RUN git clone --depth 1 https://github.com/${BRAVE_REPO}/brave.git && \
#    cd brave && \
#    pip3 install pipenv sanic && \
#    pipenv install && \
#    mkdir -p /usr/local/share/brave/output_images/

EXPOSE 5000

CMD ["pipenv", "run", "/src/brave.py", "-c", "/config/config.yaml"]
