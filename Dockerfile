FROM jekyll/jekyll:latest

WORKDIR /srv/jekyll
COPY . /srv/jekyll

RUN bundle install

CMD ["jekyll", "serve", "--host", "0.0.0.0"]