# terraform apply -var-file=envs/clase6.tfvars
proyecto = "clase6"
region   = "us-east-1"

servicios = {
  # Servidor con nginx + api + web + postgres (docker-compose de Clase 6)
  app = {
    instance_type = "t2.micro"
    volumen_gb    = 20
  }

  # Ejemplo: segundo servicio con sus propios puertos y sin IP fija.
  # Descomentar para levantarlo; borrar el bloque lo destruye.
  # metricas = {
  #   instance_type    = "t3.micro"
  #   puertos_publicos = [80, 443, 9090]
  #   cidr_permitidos  = ["203.0.113.0/24"]
  #   ip_elastica      = false
  #   user_data_extra  = "docker run -d -p 9090:9090 prom/prometheus"
  # }
}
