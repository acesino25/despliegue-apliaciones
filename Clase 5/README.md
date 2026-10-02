# DESPLIEGUE EN AWS CON TERRAFORM (PLANTILLA MULTIUSO)

El siguiente laboratorio se enfocará en desplegar una aplicación y su base de datos en AWS, pero esta vez con **una plantilla de terraform** que podremos reutilizar para levantar uno o varios servicios, cambiando solamente las variables.

En la Clase 4 creamos un archivo terraform para un único servidor. Ahora lo modularizaremos: el mismo código servirá para levantar varios servicios e ir haciendo modificaciones, sin tocar el archivo principal.

**NOTA:** __Todos los conceptos son consultables al final de este documento y en la carpeta de Clase 3 donde se deja información útil para entender términos técnicos. Se sugiere tenerlos a la mano como glosario__

**NOTA 2:** __Seguimos sin usar CLOUDFLARE, ya que requiere una configuración de dominio más avanzada. Si bien ese es un estándar de seguridad.__

**NOTA 3:** __Lo que es programación (la API en node, la web y el docker-compose) quedó como nota al final. La prioridad de esta clase es la infraestructura.__

**TIPO DE DESPLIEGUE:** __Recreate__

Apaga el contenedor funcionando e inmediatamente después inicia el de la nueva versión. Genera downtime.
En terraform esto se refleja así: si cambiamos el script de arranque del servidor, el servidor se destruye y se vuelve a crear.

## ANTES DE EMPEZAR: LAS ALERTAS Y LA FACTURACIÓN

Repite lo de la Clase 4, porque aquí también crearemos servicios que cobran:

* LAS ALERTAS NO DETIENEN LOS SERVICIOS, solo avisan.
* EL PROVEEDOR NO ES TU AMIGO, no hay una forma de negociar la deuda.
* DETEN LOS SERVICIOS, cuando sepas que ya no lo seguirás usando apaga y/o elimina las instancias. En esta clase lo haremos con un solo comando: ``terraform destroy``.

## QUÉ NECESITAMOS TENER INSTALADO

* Una cuenta en AWS con las alertas de facturación ya configuradas (Clase 4, pasos 1 y 2)
* Una cuenta en TailScale (Clase 4, paso 3)
* **Terraform** (lo instalaremos en el paso 1)
* **AWS CLI**, para que terraform pueda usar tu cuenta (lo instalaremos en el paso 2)
* Docker (ver README de la raíz del repositorio)

**NOTA:** __En la Clase 4 usamos terraform pero no quedó escrito cómo descargarlo ni cómo darle acceso a tu cuenta de AWS. Los pasos 1 y 2 de esta clase lo cubren.__

## PASOS PARA EL DESPLIEGUE

### 1) Descargar Terraform

Terraform es un tipo de IaaC, que significa que a través del código crearemos infraestructura. Se instala en **tu computadora**, no en el servidor.

Descarga oficial (elige tu sistema operativo): https://developer.hashicorp.com/terraform/install

Si usas Windows puedes instalarlo desde la consola con:

``winget install Hashicorp.Terraform``

Cierra y vuelve a abrir la consola. Para comprobar que quedó instalado:

``terraform -version``

Deberías ver algo parecido a esto (el número de versión puede cambiar):

```
Terraform v1.x.x
on windows_amd64
```

Si te dice que el comando no se reconoce, la consola no encontró el programa: cierra todas las consolas y abre una nueva. La plantilla necesita la versión **1.3.0 o superior**.

### 2) Darle acceso a terraform a tu cuenta de AWS

Terraform necesita permiso para crear cosas en tu cuenta. Para ello usaremos el AWS CLI.

Descarga: https://aws.amazon.com/cli/

Dentro de la consola de AWS crea una **Access Key** para tu usuario (IAM > Users > tu usuario > Security credentials > Create access key). Te da dos valores: Access Key ID y Secret Access Key.

**NOTA:** __Nunca subas esas claves al repositorio ni las pegues en un archivo del proyecto. Quien tenga esas claves puede crear servicios en tu cuenta y la factura será tuya (ver "EL PROVEEDOR NO ES TU AMIGO").__

Luego, en la consola:

``aws configure``

Te preguntará cuatro cosas, y responderás:

```
AWS Access Key ID [None]: (pegas tu Access Key ID)
AWS Secret Access Key [None]: (pegas tu Secret Access Key)
Default region name [None]: us-east-1
Default output format [None]: json
```

Para comprobar que funciona:

``aws sts get-caller-identity``

Deberías ver un JSON con tu "Account" (número de cuenta) y tu "Arn". Si ves un error de credenciales, repite ``aws configure``.

### 3) Generar el token de TailScale

Como en la Clase 4, el servidor se unirá a nuestra red segura y solo entraremos a él por ahí. Para ello necesita un token.

* Entra a https://login.tailscale.com/admin/settings/keys
* Elige **Generate auth key**
* Marca la opción **Ephemeral** (token efímero) y, si te la ofrece, **Reusable** para poder crear más de un servicio con el mismo token
* Copia el valor que empieza con ``tskey-auth-...``

Guardaremos el token como variable de entorno **de tu consola**, y no dentro de ningún archivo:

PowerShell (Windows):

``$env:TF_VAR_tailscale_auth_key = "tskey-auth-XXXXXXXX"``

Bash (Linux / Mac / Git Bash):

``export TF_VAR_tailscale_auth_key="tskey-auth-XXXXXXXX"``

**NOTA:** __Esta variable vive solo mientras la consola esté abierta. Si abres una consola nueva, debes volver a ponerla.__

### 4) Entender cómo se compone el archivo terraform

Todo está en la carpeta ``infra``:

```
infra/
├── versions.tf               <- qué versión de terraform y qué proveedor (AWS) usamos
├── variables.tf              <- las "preguntas" que hace la plantilla
├── main.tf                   <- los recursos: firewall, servidor, IP fija
├── outputs.tf                <- lo que nos devuelve al terminar
├── templates/
│   └── user_data.sh.tftpl    <- script que se ejecuta cuando el servidor arranca
├── envs/
│   └── clase5.tfvars         <- las "respuestas": qué servicios queremos
├── terraform.tfvars.example  <- ejemplo para copiar
└── .gitignore                <- evita subir el estado y datos privados
```

Terraform lee **todos los archivos .tf de la carpeta juntos**. Separarlos no cambia el resultado, solo lo hace legible. Lo que sí cambia entre un despliegue y otro son los archivos ``.tfvars``.

**La idea de la plantilla:** ``variables.tf`` + ``main.tf`` nunca se tocan. Para levantar otra cosa, se crea un ``.tfvars`` nuevo con otras respuestas. Ese es el motivo por el que la llamamos plantilla multiuso.

#### 4.1) versions.tf

```
terraform {
  required_version = ">= 1.3.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = merge({ Proyecto = var.proyecto, ManagedBy = "terraform" }, var.tags)
  }
}
```

* **required_version**: si alguien con una versión vieja intenta usar la plantilla, terraform le avisa en lugar de fallar a mitad de camino. Pedimos 1.3.0 porque desde ahí existen los valores por defecto dentro de las variables (los usamos en variables.tf).
* **required_providers**: el provider es el "traductor" entre terraform y AWS. Fijamos la versión ``~> 5.0`` para que una actualización futura no rompa la plantilla.
* **provider "aws"**: la región sale de una variable, así que cambiar de región no requiere tocar código.
* **default_tags**: todo lo que se cree queda etiquetado con el nombre del proyecto. Sirve para encontrar en la consola de AWS qué recursos nos están cobrando.

#### 4.2) variables.tf

Define las variables que la plantilla acepta. Las importantes:

| Variable | Para qué sirve |
|---|---|
| ``region`` | Región de AWS (por defecto us-east-1) |
| ``proyecto`` | Nombre que prefija todos los recursos. Evita que dos despliegues se pisen |
| ``tailscale_auth_key`` | El token. Marcada como ``sensitive`` para que terraform no lo muestre en pantalla |
| ``key_name`` | Llave .pem, opcional. Como entramos por TailScale, ya no es obligatoria |
| ``ami_id`` | Imagen del servidor. Si se deja vacía busca la última Ubuntu 22.04 oficial |
| ``servicios`` | **La más importante.** La lista de servicios que queremos |

La variable ``servicios`` es un **mapa**: el nombre del servicio es la clave, y cada uno tiene su configuración:

```
servicios = {
  app = {
    instance_type    = "t2.micro"    # tamaño del servidor
    volumen_gb       = 20            # tamaño del disco
    puertos_publicos = [80, 443]     # qué puertos ve el mundo
    cidr_permitidos  = ["0.0.0.0/0"] # quién puede entrar a esos puertos
    ip_elastica      = true          # IP fija
    instalar_docker  = true
    user_data_extra  = ""            # comandos extra al arrancar
    tags             = {}
  }
}
```

Todos los campos son opcionales y tienen un valor por defecto. Por eso ``app = {}`` ya es un servicio válido.

Además, la variable ``servicios`` tiene **validaciones** que frenan errores antes de crear nada:

* Debe existir al menos un servicio.
* Los nombres solo pueden tener minúsculas, números y guiones (porque se usan como nombre de la máquina en TailScale).
* **No se puede abrir el puerto 22.** Es la regla de HARDENING con Zero Trust Network Access: el acceso administrativo va solo por TailScale, nunca abierto al mundo.

#### 4.3) main.tf

Tiene cuatro partes:

**a) Buscar la imagen del servidor (data)**

```
data "aws_ami" "ubuntu" { ... owners = ["099720109477"] ... }
```

En la Clase 4 la AMI estaba escrita a mano (``ami-0c7217...``). Una AMI vieja queda desactualizada y sin parches de seguridad. Ahora terraform consulta a AWS cuál es la más reciente publicada por Canonical (el creador de Ubuntu).

**b) El firewall: un Security Group por servicio**

```
resource "aws_security_group" "servicio" {
  for_each = var.servicios
  ...
  dynamic "ingress" {
    for_each = each.value.puertos_publicos
    ...
  }
}
```

* ``for_each = var.servicios``: por cada entrada del mapa crea **un** Security Group. Si tenemos tres servicios, se crean tres. Ese es el mecanismo que vuelve reutilizable la plantilla.
* ``dynamic "ingress"``: en la Clase 4 escribíamos un bloque ``ingress`` por puerto (uno para 443, otro para 80). Con ``dynamic`` escribimos el bloque una sola vez y se repite por cada puerto de la lista ``puertos_publicos``.
* El ``egress`` (salida a internet) queda abierto para descargar contenedores y conectar TailScale, igual que en la Clase 4.
* No existe ninguna regla para el puerto 22.

**c) El servidor**

```
resource "aws_instance" "servicio" {
  for_each = var.servicios
  ...
}
```

También un servidor por cada servicio. Se agregaron tres medidas de HARDENING que no estaban en la Clase 4:

* ``metadata_options { http_tokens = "required" }``: obliga a usar IMDSv2, una forma más segura de que el servidor consulte sus propios datos. Evita que un atacante robe credenciales aprovechando una falla de la aplicación.
* ``root_block_device { encrypted = true }``: el disco va cifrado.
* ``key_name = var.key_name``: si es ``null`` no se asocia ninguna llave .pem.

``user_data`` lee el archivo ``templates/user_data.sh.tftpl`` y le reemplaza los valores (nombre de la máquina, token de TailScale, si instala docker, comandos extra). Es el mismo script de la Clase 4 (instalar docker, instalar tailscale y hacer ``tailscale up --ssh``), pero convertido en plantilla para que cada servicio tenga su propio nombre en TailScale: ``proyecto-servicio``, por ejemplo ``clase5-app``.

``user_data_replace_on_change = true`` es lo que hace que el despliegue sea de tipo **Recreate**: si el script cambia, el servidor se destruye y se vuelve a crear.

**d) La IP fija (Elastic IP)**

```
resource "aws_eip" "servicio" {
  for_each = { for k, s in var.servicios : k => s if s.ip_elastica }
  ...
}
```

Solo se crea para los servicios que tengan ``ip_elastica = true``. Sin ella, la IP pública cambia cada vez que se apaga y enciende la máquina, y tendríamos que volver a buscar la IP con la que hacemos las pruebas.

#### 4.4) outputs.tf

Al terminar, terraform muestra por cada servicio: la IP pública, el ID de la instancia, y el nombre de la máquina en TailScale. En la Clase 4 el output era solo la IP; ahora es uno por cada servicio.

#### 4.5) envs/clase5.tfvars

Es el único archivo que se edita para cada despliegue:

```
proyecto = "clase5"
region   = "us-east-1"

servicios = {
  app = {
    instance_type = "t2.micro"
    volumen_gb    = 20
  }
}
```

Para levantar un segundo servicio solo agregamos otra entrada dentro de ``servicios``. Para destruirlo, la borramos. Ejemplo:

```
servicios = {
  app = {}
  metricas = {
    instance_type    = "t3.micro"
    puertos_publicos = [80, 443, 9090]
    ip_elastica      = false
  }
}
```

Y para un proyecto distinto se crea un archivo nuevo, por ejemplo ``envs/otro-proyecto.tfvars``, con otro valor de ``proyecto``.

**NOTA:** __El nombre del servicio (la clave) no se debe cambiar después de crearlo: para terraform, cambiar el nombre es destruir el servidor y crear otro.__

### 5) Inicializamos terraform

Posicionados dentro de la carpeta ``infra``:

``cd infra``

``terraform init``

Descarga el provider de AWS. **Esperamos** ver al final:

```
Terraform has been successfully initialized!
```

Se crea una carpeta ``.terraform`` y un archivo ``.terraform.lock.hcl``. Esto es normal. Terraform solo se ejecuta bien dentro de la carpeta que tiene los .tf.

Opcional pero recomendado, para revisar que no hay errores de escritura:

``terraform validate``

**Esperamos:** ``Success! The configuration is valid.``

### 5.1) Opcional: probar sin cuenta de AWS

Si aún no tienes cuenta de AWS (o no quieres usarla todavía), puedes hacer todo **hasta el plan** sin credenciales. Para eso existe la variable ``modo_prueba``, que usa credenciales falsas y no consulta a AWS.

``terraform plan "-var-file=envs/clase5.tfvars" "-var=modo_prueba=true" "-var=tailscale_auth_key=cualquier-cosa"``

**Esperamos** ver ``Plan: 3 to add, 0 to change, 0 to destroy.`` Es el mismo resultado que en el paso 6.

**NOTA:** __Con ``modo_prueba`` el ``apply`` NO funciona: no hay cuenta real detrás. Sirve para entender qué crearía terraform y comprobar que los archivos están bien escritos. Para crear el servidor de verdad se necesita la cuenta (paso 2).__

Tampoco necesita el token real de TailScale: aquí ponemos cualquier texto.

### 6) Vemos qué va a crear (plan)

``terraform plan "-var-file=envs/clase5.tfvars"``

**No crea nada todavía.** Solo muestra qué haría. Cada recurso aparece con un ``+`` (se creará). **Esperamos** ver al final, para el ejemplo de un solo servicio:

```
Plan: 3 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + servicios = {
      + app = { ... }
    }
```

Los 3 son: el Security Group, el servidor y la IP fija. Si agregamos un segundo servicio con IP fija, serán 6.

Si te aparece un error, léelo completo: suele indicar el archivo y la línea. Los más comunes:

| Error | Causa |
|---|---|
| ``No valid credential sources found`` | No hiciste ``aws configure`` (paso 2) |
| ``No value for required variable ... tailscale_auth_key`` | Falta exportar la variable en esta consola (paso 3) |
| ``Invalid value for variable ... puertos_publicos`` | Pusiste el puerto 22, que está prohibido a propósito |
| ``No configuration files`` | No estás dentro de la carpeta ``infra`` |

### 7) Creamos la infraestructura (apply)

``terraform apply "-var-file=envs/clase5.tfvars"``

Vuelve a mostrar el plan y **pregunta**:

```
Do you want to perform these actions?
  Enter a value:
```

Escribimos ``yes`` y presionamos Enter. Tarda entre 1 y 3 minutos. **Esperamos** ver al final:

```
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:

servicios = {
  "app" = {
    "instance_id" = "i-0abc123..."
    "ip_publica" = "203.0.113.50"
    "tailscale_hostname" = "clase5-app"
  }
}
```

(Tu IP será distinta.) Para volver a ver esta información cuando quieras:

``terraform output``

### 8) Comprobamos que el servidor esté en la red segura

El servidor tarda un par de minutos más en ejecutar el script de arranque. Para saber si ya se unió a TailScale:

``tailscale status``

Deberías ver en la lista una máquina llamada ``clase5-app``. También aparece en https://login.tailscale.com/admin/machines. Tu computadora también debe tener TailScale instalado y conectado.

Entramos por SSH usando el nombre de TailScale (no la IP pública):

``ssh ubuntu@clase5-app``

**Esperamos** entrar sin que nos pida contraseña ni llave .pem, porque TailScale nos autentica. Dentro del servidor comprobamos que docker está instalado:

``docker --version``

``docker compose version``

Para volver a nuestra computadora:

``exit``

**Y comprobamos el HARDENING:** desde tu computadora intenta conectarte por la IP pública:

``ssh ubuntu@203.0.113.50``

**Esperamos** que se quede colgado y termine con ``Connection timed out``. Eso significa que el puerto 22 está cerrado al mundo, que es lo que queríamos.

### 9) Desplegamos la aplicación en el servidor

Ya tenemos el servidor con docker. Ahora llevaremos la aplicación (ver la nota de programación al final para saber qué contiene). Desde la carpeta ``Clase 5`` de tu computadora:

1) Creamos la carpeta destino en el servidor:

``ssh ubuntu@clase5-app "mkdir -p ~/clase5"``

2) Copiamos los archivos necesarios (sin ``node_modules``, que se instala dentro de la imagen):

``scp -r api static Dockerfile .dockerignore docker-compose.yml nginx.conf package.json pnpm-lock.yaml ubuntu@clase5-app:~/clase5/``

3) Entramos al servidor:

``ssh ubuntu@clase5-app``

``cd ~/clase5``

4) Creamos la imagen, tal como en la Clase 1 y 2:

``docker build -t api-node:v1 .``

**Esperamos** ver al final ``naming to docker.io/library/api-node:v1``.

5) Levantamos los servicios:

``docker compose up -d``

**Esperamos** ver ``Container clase5_pg_db Started``, ``Started`` para api y ``Container clase5_nginx Started``.

6) Comprobamos los contenedores:

``docker ps -a``

Deben aparecer tres contenedores en estado ``Up``. Si alguno aparece como ``Restarting`` o ``Exited``, vemos su consola:

``docker logs -f nombre-contenedor``

Si la api dice ``DB no disponible (intento 1/10)`` es normal durante unos segundos, porque reintenta hasta que la base de datos esté lista.

### 10) Probamos el resultado

Desde tu computadora (reemplaza por la IP que te dio terraform):

``curl http://203.0.113.50/api/patentes``

**Esperamos** ``[]`` (lista vacía, porque aún no hay patentes). Cargamos una:

``curl -X POST http://203.0.113.50/api/patentes -H "Content-Type: application/json" -d "{\"dominio\":\"AB123CD\",\"descripcion\":\"Ford Falcon verde\"}"``

**Esperamos** un JSON con ``id``, ``dominio``, ``descripcion`` y ``created_at``. Si la consultamos otra vez con el primer comando, ahora aparece en la lista.

Y finalmente abrimos en el navegador ``http://203.0.113.50`` donde veremos la web con el logo, la barra de búsqueda y el formulario de carga.

**NOTA:** __Salimos únicamente por nginx, con HTTP (puerto 80) y usando la IP pública para las pruebas. Si más adelante se necesitan certificados, se usará certbot con nginx. S3 queda para la Clase 6.__

### 11) Modificamos la infraestructura (la parte de la plantilla)

Esto es lo que diferencia esta clase de la Clase 4. Sin tocar ``main.tf`` ni ``variables.tf``:

* Editamos ``envs/clase5.tfvars`` y agregamos un segundo servicio (ver el ejemplo del paso 4.5)
* ``terraform plan "-var-file=envs/clase5.tfvars"``

**Esperamos** ver ``Plan: 3 to add, 0 to change, 0 to destroy.`` Es decir, **el servicio ``app`` no se toca**, solo se agrega el nuevo.

* ``terraform apply "-var-file=envs/clase5.tfvars"`` y respondemos ``yes``

Cambiar un valor que se puede modificar en caliente (por ejemplo, agregar un puerto a ``puertos_publicos``) aparece con ``~`` (se modifica). Cambiar el ``user_data_extra`` aparece con ``-/+`` (se destruye y se vuelve a crear: **Recreate**, con downtime).

### 12) Destruimos todo

Cuando terminemos de probar, recordamos lo que dijimos al principio: DETEN LOS SERVICIOS.

``terraform destroy "-var-file=envs/clase5.tfvars"``

Pregunta ``Enter a value:`` y escribimos ``yes``. **Esperamos**:

```
Destroy complete! Resources: 3 destroyed.
```

Comprobamos en la consola de AWS (EC2 > Instances y EC2 > Elastic IPs) que no quede nada. Una IP fija sin usar también genera cargos.

## TAREA FINAL

Cada alumno deberá **aplicar terraform en su computadora**. Para dar la tarea por realizada debes entregar:

1) Captura de ``terraform -version`` funcionando.
2) Captura del ``terraform plan`` mostrando ``Plan: 3 to add, 0 to change, 0 to destroy.``
3) Captura del ``terraform apply`` terminado con ``Apply complete!`` y los outputs.
4) Captura de ``tailscale status`` con tu servidor ``clase5-app`` en la lista.
5) Captura del navegador con la web funcionando, con al menos una patente cargada.
6) **Modificación:** agrega un segundo servicio en tu archivo ``.tfvars`` (con otro nombre y al menos un puerto público distinto), ejecuta ``plan`` y ``apply`` y entrega la captura donde se vea que el primer servicio no fue modificado.
7) Captura del ``terraform destroy`` terminado con ``Destroy complete!``.

**NOTA:** __Sin el punto 7 el servicio queda cobrando. Ese paso NO es opcional.__

---------------------------------------------------------------------

## NOTA: LA PARTE DE PROGRAMACIÓN

Esta parte no es el foco de la clase, pero es lo que desplegamos.

La aplicación es una web para cargar y listar patentes, con una API en node que conecta con postgres.

**Estructura de la API (carpeta ``api``)**. Cada carpeta tiene un README que explica el formato de sus archivos:

| Carpeta | Qué hace |
|---|---|
| ``routes`` | Definición de endpoints |
| ``controllers`` | Maneja los requests/responses HTTP |
| ``services`` | Lógica de negocio independiente a HTTP (validaciones) |
| ``models`` | Consultas SQL |
| ``config`` | Conexión a la base de datos, usando las variables de entorno del docker-compose |
| ``middleware`` | Validación, manejo de errores, JWT, etc. (aún vacío) |

**Endpoints**

| Método | Ruta | Qué hace |
|---|---|---|
| GET | ``/api/patentes`` | Lista todas |
| GET | ``/api/patentes?dominio=ABC123,AB123CD`` | Lista una o más patentes por dominio |
| GET | ``/api/patentes/:id`` | Devuelve una sola |
| POST | ``/api/patentes`` | Carga una patente ``{dominio, descripcion}`` o varias enviando una lista. Si una falla, no se carga ninguna |

Los dominios válidos son ``ABC123`` o ``AB123CD``. La tabla ``patentes`` se crea sola al iniciar la API.

**La web (carpeta ``static``)**: ``index.html`` y ``main.js`` con el logo, una barra de búsqueda y un formulario de carga. Consulta a ``/api/patentes``.

**El docker-compose de esta clase** tiene tres servicios, igual que la lógica de la Clase 2:

* ``api``: la imagen ``api-node:v1`` que creamos con el Dockerfile (es un **multi staged**, ver definiciones).
* ``db``: postgres, con un volumen ``pg_data`` para que los datos persistan.
* ``nginx``: recibe todo en el puerto 80. Si la ruta empieza con ``/api/`` la manda a la api; el resto lo sirve desde la carpeta ``static``.

Para probarlo en local, sin AWS, posicionados en la carpeta ``Clase 5``:

``docker build -t api-node:v1 .``

``docker compose up -d``

y luego abrimos ``http://localhost``.

## DEFINICIONES

**TERRAFORM** Herramienta de IaaC. Escribimos en archivos ``.tf`` cómo queremos la infraestructura, y terraform se encarga de crearla, modificarla o destruirla.

**IaaC (Infraestructura como código)** Crear infraestructura a través del código en vez de hacer clic en la consola de AWS. Ventaja: es repetible, se puede revisar y se puede destruir con un comando.

**PROVIDER** El "traductor" entre terraform y un proveedor (AWS, en nuestro caso). Se descarga con ``terraform init``.

**RESOURCE** Cada cosa que terraform crea: un servidor, un firewall, una IP.

**DATA** Algo que terraform consulta pero no crea. Nosotros consultamos cuál es la imagen de Ubuntu más reciente.

**VARIABLE** Un valor que se define desde fuera del código. Es lo que hace que una plantilla se pueda reutilizar.

**OUTPUT** Datos que terraform nos muestra al terminar (como la IP del servidor).

**MODO_PRUEBA** Variable de nuestra plantilla. En ``true`` terraform usa credenciales falsas y no consulta a AWS, así que se puede hacer ``plan`` sin cuenta. No permite ``apply``.

**.tfvars** Archivo donde se escriben los valores de las variables. Uno por cada despliegue.

**MAPA (map)** Una lista donde cada elemento tiene un nombre. Nuestra variable ``servicios`` es un mapa: el nombre es la clave del servicio.

**for_each** Instrucción que le dice a terraform: "repite este recurso una vez por cada elemento". Es la base de la plantilla multiuso.

**dynamic** Instrucción para repetir un bloque dentro de un recurso, como una regla de firewall por cada puerto.

**terraform init / plan / apply / destroy** Preparar la carpeta y descargar el provider / mostrar lo que se haría sin hacerlo / hacerlo / eliminar todo lo que terraform creó.

**ESTADO (terraform.tfstate)** Archivo donde terraform anota qué creó. Así sabe qué hay que agregar, modificar o eliminar la próxima vez. **No se borra, ni se sube al repositorio**: contiene datos sensibles, incluido el token de TailScale. Si lo pierdes, terraform "olvida" lo que creó y los servidores quedan cobrando sin que él los pueda destruir.

**EC2** El servicio de AWS que ofrece servidores (máquinas virtuales). Una "instancia" es un servidor.

**AMI** La imagen de sistema operativo con la que arranca un servidor. Nosotros usamos Ubuntu 22.04 LTS.

**SECURITY GROUP** Las reglas de firewall de un servidor: qué puertos se aceptan y desde dónde (**ingress** es lo que entra, **egress** lo que sale).

**CIDR** Forma de escribir un rango de direcciones IP. ``0.0.0.0/0`` significa "cualquiera en el mundo".

**ELASTIC IP** Una IP pública fija que se asigna al servidor. Si no la usamos, la IP cambia al apagar y encender.

**USER DATA** Script que el servidor ejecuta una sola vez, la primera vez que arranca. Lo usamos para instalar docker y TailScale.

**TAILSCALE** Red segura que enlaza computadoras como una RED LAN virtual, usando el protocolo WireGuard. Ver Clase 4.

**HARDENING** Endurecer la seguridad de un sistema cerrando todo lo que no sea necesario. Aquí: puerto 22 cerrado, disco cifrado, IMDSv2 obligatorio.

**ZERO TRUST NETWORK ACCESS** No confiar en nadie por defecto: solo entra a administrar el servidor quien esté autenticado dentro de la red de TailScale.

**IMDSv2** Versión segura del servicio con el que un servidor de AWS consulta sus propios datos (por ejemplo, sus credenciales temporales). Exigirla evita que un atacante las robe a través de una falla en la aplicación.

**RECREATE** Tipo de despliegue donde se apaga lo anterior y se inicia la nueva versión. Genera downtime.

**MULTI STAGED** Dockerfile de dos partes: el builder, donde se instala y compila, y producción, con un SO minimizado que contiene solo la app. Es más seguro (menos herramientas para un atacante) y más liviano. Ver ``PLANTILLA-DOCKER.md``.

**PROXY INVERSO (nginx)** Servicio que recibe las peticiones y las reparte: a los archivos estáticos o hacia la API. Los usuarios solo ven un único puerto, el 80.

**POSTGRES** Base de datos relacional. En el docker-compose corre como un contenedor propio, con un volumen para no perder los datos.

**VOLUMEN** Espacio donde el contenedor guarda datos que deben sobrevivir aunque el contenedor se elimine.

**VARIABLE DE ENTORNO** Valor que se le pasa a un programa desde fuera de su código. La usamos para el token de TailScale (``TF_VAR_...``) y para la conexión de la API a postgres.

**API** Servicio que recibe pedidos, consulta la base de datos y devuelve información al frontend. Ver BACKEND y FRONTEND en la Clase 2.


---

## CHEAT SHEET: SERVICIOS DE AWS POR PATRÓN DE DISEÑO

Lista rápida de qué servicios de AWS se usan para construir cada tipo de arquitectura. Entre paréntesis, el nombre del recurso en terraform (``aws_...``).

### 1) Patrón de cómputo

| Patrón | Servicios | Recurso terraform |
|---|---|---|
| **Servidor tradicional (VM)** | EC2, AMI, Elastic IP, Security Group | ``aws_instance``, ``aws_eip``, ``aws_security_group`` |
| **Contenedores** | ECS, EKS, Fargate, ECR (registro de imágenes) | ``aws_ecs_cluster``, ``aws_ecs_service``, ``aws_eks_cluster``, ``aws_ecr_repository`` |
| **Serverless (funciones)** | Lambda, API Gateway | ``aws_lambda_function``, ``aws_apigatewayv2_api`` |
| **PaaS (sin manejar servidores)** | Elastic Beanstalk, App Runner, Lightsail | ``aws_elastic_beanstalk_environment``, ``aws_apprunner_service`` |
| **Batch / procesamiento por lotes** | AWS Batch, Step Functions | ``aws_batch_job_definition``, ``aws_sfn_state_machine`` |

### 2) Patrón de red y entrada de tráfico

| Patrón | Servicios | Recurso terraform |
|---|---|---|
| **Red aislada** | VPC, Subnet, Internet Gateway, NAT Gateway, Route Table | ``aws_vpc``, ``aws_subnet``, ``aws_internet_gateway``, ``aws_nat_gateway``, ``aws_route_table`` |
| **Firewall** | Security Group, Network ACL, WAF | ``aws_security_group``, ``aws_network_acl``, ``aws_wafv2_web_acl`` |
| **Balanceo de carga** | ALB (HTTP), NLB (TCP), Target Group | ``aws_lb``, ``aws_lb_target_group``, ``aws_lb_listener`` |
| **DNS y dominio** | Route 53, ACM (certificados HTTPS) | ``aws_route53_zone``, ``aws_route53_record``, ``aws_acm_certificate`` |
| **CDN / borde** | CloudFront | ``aws_cloudfront_distribution`` |
| **Conexión privada** | VPN, Direct Connect, VPC Peering, PrivateLink | ``aws_vpn_connection``, ``aws_vpc_peering_connection``, ``aws_vpc_endpoint`` |

### 3) Patrón de alta disponibilidad y escalado

| Patrón | Servicios | Recurso terraform |
|---|---|---|
| **Autoescalado** | Auto Scaling Group, Launch Template | ``aws_autoscaling_group``, ``aws_launch_template`` |
| **Multi-AZ** | Subnets en varias zonas + ALB + RDS Multi-AZ | ``aws_subnet`` (``availability_zone``), ``aws_db_instance`` (``multi_az = true``) |
| **Multi-región / failover** | Route 53 (health checks), S3 replication, Aurora Global | ``aws_route53_health_check``, ``aws_s3_bucket_replication_configuration`` |
| **Despliegue sin downtime (Blue/Green, Canary)** | CodeDeploy, ALB con dos Target Groups | ``aws_codedeploy_deployment_group`` |

### 4) Patrón de datos

| Patrón | Servicios | Recurso terraform |
|---|---|---|
| **Base de datos relacional** | RDS (Postgres, MySQL), Aurora | ``aws_db_instance``, ``aws_rds_cluster`` |
| **NoSQL clave-valor** | DynamoDB | ``aws_dynamodb_table`` |
| **Caché** | ElastiCache (Redis, Memcached) | ``aws_elasticache_cluster`` |
| **Almacenamiento de objetos / sitio estático** | S3 | ``aws_s3_bucket`` |
| **Disco de servidor** | EBS | ``aws_ebs_volume`` |
| **Archivos compartidos** | EFS | ``aws_efs_file_system`` |
| **Búsqueda** | OpenSearch | ``aws_opensearch_domain`` |
| **Data lake / analítica** | S3 + Glue + Athena, Redshift, Kinesis | ``aws_glue_catalog_database``, ``aws_athena_workgroup``, ``aws_redshift_cluster`` |
| **Respaldos** | AWS Backup, snapshots | ``aws_backup_plan``, ``aws_db_snapshot`` |

### 5) Patrón de mensajería y eventos (desacoplar)

| Patrón | Servicios | Recurso terraform |
|---|---|---|
| **Cola (productor/consumidor)** | SQS | ``aws_sqs_queue`` |
| **Publicación/suscripción (fan-out)** | SNS | ``aws_sns_topic``, ``aws_sns_topic_subscription`` |
| **Bus de eventos** | EventBridge | ``aws_cloudwatch_event_bus``, ``aws_cloudwatch_event_rule`` |
| **Streaming en tiempo real** | Kinesis, MSK (Kafka) | ``aws_kinesis_stream``, ``aws_msk_cluster`` |
| **Orquestación de flujos** | Step Functions | ``aws_sfn_state_machine`` |
| **Tareas programadas (cron)** | EventBridge Scheduler | ``aws_scheduler_schedule`` |

### 6) Patrón de seguridad

| Patrón | Servicios | Recurso terraform |
|---|---|---|
| **Identidad y permisos** | IAM (usuarios, roles, políticas), IAM Identity Center | ``aws_iam_role``, ``aws_iam_policy``, ``aws_iam_user`` |
| **Autenticación de usuarios de la app** | Cognito | ``aws_cognito_user_pool`` |
| **Secretos y configuración** | Secrets Manager, SSM Parameter Store | ``aws_secretsmanager_secret``, ``aws_ssm_parameter`` |
| **Cifrado** | KMS | ``aws_kms_key`` |
| **Detección de amenazas** | GuardDuty, Security Hub, Inspector | ``aws_guardduty_detector``, ``aws_securityhub_account`` |
| **Auditoría** | CloudTrail, AWS Config | ``aws_cloudtrail``, ``aws_config_configuration_recorder`` |
| **Acceso administrativo sin puerto 22** | SSM Session Manager (alternativa a TailScale) | ``aws_ssm_document``, rol con ``AmazonSSMManagedInstanceCore`` |

### 7) Patrón de observabilidad

| Patrón | Servicios | Recurso terraform |
|---|---|---|
| **Logs** | CloudWatch Logs | ``aws_cloudwatch_log_group`` |
| **Métricas y alarmas** | CloudWatch Metrics / Alarms | ``aws_cloudwatch_metric_alarm`` |
| **Dashboards** | CloudWatch Dashboards | ``aws_cloudwatch_dashboard`` |
| **Trazas distribuidas** | X-Ray | ``aws_xray_sampling_rule`` |
| **Alertas de costo** | AWS Budgets | ``aws_budgets_budget`` |

### 8) Patrón de CI/CD e infraestructura como código

| Patrón | Servicios | Recurso terraform |
|---|---|---|
| **Repositorio** | CodeCommit (o GitHub) | ``aws_codecommit_repository`` |
| **Build** | CodeBuild | ``aws_codebuild_project`` |
| **Pipeline** | CodePipeline | ``aws_codepipeline`` |
| **Despliegue** | CodeDeploy | ``aws_codedeploy_app`` |
| **Estado remoto de terraform** | S3 + DynamoDB (bloqueo) | ``aws_s3_bucket``, ``aws_dynamodb_table`` |
| **IaC propio de AWS** | CloudFormation, CDK | ``aws_cloudformation_stack`` |

### 9) Arquitecturas completas (qué combinar)

| Arquitectura | Combinación de servicios |
|---|---|
| **Servidor único (esta clase)** | EC2 + Security Group + Elastic IP + (TailScale) |
| **Web de 3 capas** | Route 53 → CloudFront → ALB → EC2/ASG → RDS (+ ElastiCache), todo en una VPC con subnets públicas y privadas |
| **Sitio estático** | S3 + CloudFront + Route 53 + ACM |
| **API serverless** | API Gateway + Lambda + DynamoDB + Cognito |
| **Microservicios en contenedores** | ECR + ECS Fargate + ALB + RDS + Secrets Manager |
| **Procesamiento asíncrono** | API → SQS → Lambda/ECS worker → S3/DynamoDB, con SNS para notificar |
| **Orientada a eventos** | EventBridge + Lambda + Step Functions + SQS |
| **Pipeline de datos** | Kinesis → S3 → Glue → Athena/Redshift |

> **Tip:** para ubicar el nombre exacto de un recurso en terraform, busca en la documentación del provider ``registry.terraform.io/providers/hashicorp/aws`` el servicio y verás todos sus ``aws_...`` disponibles.
