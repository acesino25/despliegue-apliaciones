###########################################################
# PLANTILLA MULTIUSO: todo lo que cambia entre despliegues #
# se define por variables (ver envs/*.tfvars).             #
###########################################################

variable "region" {
  description = "Región de AWS donde se despliega"
  type        = string
  default     = "us-east-1"
}

variable "proyecto" {
  description = "Nombre del proyecto/entorno. Prefija todos los recursos (ej: clase6-prod)"
  type        = string
}

variable "tags" {
  description = "Tags extra aplicados a todos los recursos"
  type        = map(string)
  default     = {}
}

variable "tailscale_auth_key" {
  description = "Token efímero de Tailscale (tskey-auth-...). Pasar por TF_VAR_tailscale_auth_key, no en un archivo"
  type        = string
  sensitive   = true
}

variable "key_name" {
  description = "Key pair de AWS (.pem) opcional. Si es null no se asocia ninguna: el acceso es por Tailscale SSH"
  type        = string
  default     = null
}

variable "ami_id" {
  description = "AMI fija para todos los servicios. Si es null se usa la última Ubuntu 22.04 LTS oficial"
  type        = string
  default     = null
}

variable "servicios" {
  description = <<-EOT
    Mapa de servicios a levantar. La clave es el nombre del servicio y cada
    uno recibe su propia EC2 + Security Group (+ IP elástica opcional).
    Agregar una entrada = un servicio nuevo; borrarla = destruirlo.
  EOT

  type = map(object({
    instance_type    = optional(string, "t2.micro")
    volumen_gb       = optional(number, 20)
    puertos_publicos = optional(list(number), [80, 443]) # SSH nunca se abre: va por Tailscale
    cidr_permitidos  = optional(list(string), ["0.0.0.0/0"])
    ip_elastica      = optional(bool, true) # IP fija: sobrevive a stop/start
    instalar_docker  = optional(bool, true)
    user_data_extra  = optional(string, "") # comandos bash adicionales al final del arranque
    tags             = optional(map(string), {})
  }))

  validation {
    condition     = length(var.servicios) > 0
    error_message = "Definí al menos un servicio en la variable 'servicios'."
  }

  validation {
    condition     = alltrue([for k, _ in var.servicios : can(regex("^[a-z0-9-]+$", k))])
    error_message = "Los nombres de servicio solo pueden tener minúsculas, números y guiones (se usan como hostname)."
  }

  validation {
    condition     = alltrue([for _, s in var.servicios : !contains(s.puertos_publicos, 22)])
    error_message = "No abras el puerto 22 al público: el acceso administrativo es por Tailscale."
  }
}
