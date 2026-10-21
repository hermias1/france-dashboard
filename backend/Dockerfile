FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Enforce the emSign CA incident policy after all dependency installation.
USER 0:0
COPY security-ca/ /opt/security-ca/
RUN apt-get update -o APT::Update::Error-Mode=any && apt-get install -y --no-install-recommends --only-upgrade ca-certificates && rm -rf /var/lib/apt/lists/* && /usr/local/bin/python3 /opt/security-ca/bootstrap.py /usr/local/bin/python3
USER root
