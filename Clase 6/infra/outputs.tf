locals {
  ips = {
    for k, _ in var.servicios :
    k => try(aws_eip.servicio[k].public_ip, aws_instance.servicio[k].public_ip)
  }
}

output "servicios" {
  description = "Datos de cada servicio desplegado"
  value = {
    for k, _ in var.servicios : k => {
      ip_publica         = local.ips[k]
      instance_id        = aws_instance.servicio[k].id
      tailscale_hostname = "${local.prefijo}-${k}"
    }
  }
}
