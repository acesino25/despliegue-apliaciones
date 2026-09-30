data "aws_ami" "ubuntu" {
  count       = var.ami_id == null ? 1 : 0
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

locals {
  ami_id  = var.ami_id != null ? var.ami_id : data.aws_ami.ubuntu[0].id
  prefijo = var.proyecto
}

#####################################
# FIREWALL: un Security Group por   #
# servicio, con los puertos del map #
#####################################
resource "aws_security_group" "servicio" {
  for_each = var.servicios

  name        = "${local.prefijo}-${each.key}"
  description = "${local.prefijo}-${each.key} puertos publicos por variables. SSH solo por Tailscale"

  dynamic "ingress" {
    for_each = each.value.puertos_publicos
    content {
      description = "Trafico publico TCP ${ingress.value}"
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = each.value.cidr_permitidos
    }
  }

  egress {
    description = "Salida a internet (contenedores y Tailscale)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge({ Name = "${local.prefijo}-${each.key}" }, each.value.tags)
}

#######################
# SERVIDORES          #
#######################
resource "aws_instance" "servicio" {
  for_each = var.servicios

  ami                    = local.ami_id
  instance_type          = each.value.instance_type
  key_name               = var.key_name
  vpc_security_group_ids = [aws_security_group.servicio[each.key].id]

  # IMDSv2 obligatorio (mitiga robo de credenciales vía SSRF)
  metadata_options {
    http_tokens   = "required"
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_size = each.value.volumen_gb
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/templates/user_data.sh.tftpl", {
    hostname           = "${local.prefijo}-${each.key}"
    tailscale_auth_key = var.tailscale_auth_key
    instalar_docker    = each.value.instalar_docker
    user_data_extra    = each.value.user_data_extra
  })
  user_data_replace_on_change = true # estrategia Recreate: si cambia el script se recrea

  tags = merge({ Name = "${local.prefijo}-${each.key}" }, each.value.tags)
}

resource "aws_eip" "servicio" {
  for_each = { for k, s in var.servicios : k => s if s.ip_elastica }

  domain   = "vpc"
  instance = aws_instance.servicio[each.key].id

  tags = { Name = "${local.prefijo}-${each.key}" }
}
