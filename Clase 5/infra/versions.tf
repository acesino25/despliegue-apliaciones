terraform {
  required_version = ">= 1.3.0" # optional() con defaults en objetos

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region

  # modo_prueba: permite validar y hacer "plan" SIN cuenta de AWS (credenciales falsas, sin consultar a AWS)
  access_key                  = var.modo_prueba ? "prueba" : null
  secret_key                  = var.modo_prueba ? "prueba" : null
  skip_credentials_validation = var.modo_prueba
  skip_requesting_account_id  = var.modo_prueba
  skip_metadata_api_check     = var.modo_prueba

  # Todo lo que cree esta plantilla queda etiquetado (útil para costos y para limpiar)
  default_tags {
    tags = merge({
      Proyecto  = var.proyecto
      ManagedBy = "terraform"
    }, var.tags)
  }
}
