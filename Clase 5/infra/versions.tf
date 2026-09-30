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

  # Todo lo que cree esta plantilla queda etiquetado (útil para costos y para limpiar)
  default_tags {
    tags = merge({
      Proyecto  = var.proyecto
      ManagedBy = "terraform"
    }, var.tags)
  }
}
