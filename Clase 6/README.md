# DESPLIEGUE AUTOMÁTICO CON GITHUB ACTIONS Y TAILSCALE

El siguiente laboratorio se enfocará en que **cada vez que subamos un cambio a nuestro repositorio de GitHub, el servidor en AWS se actualice solo**. GitHub Actions entrará al servidor a través del túnel de TailScale, sin abrir el puerto 22 al mundo.

En la Clase 5 creamos el servidor con terraform y copiamos la aplicación a mano con ``scp``. Ahora esa parte la hará GitHub Actions cada vez que hagamos ``git push``.

**NOTA:** __Todos los conceptos son consultables al final de este documento y en la carpeta de Clase 3 donde se deja información útil para entender términos técnicos. Se sugiere tenerlos a la mano como glosario__

**NOTA 2:** __La infraestructura (terraform) es la misma plantilla de la Clase 5. Solo cambia el nombre del proyecto a ``clase6``. Lo nuevo es el archivo ``.github/workflows/deploy-clase6.yml`` y la configuración de TailScale y GitHub.__

**NOTA 3:** __Seguimos saliendo únicamente por nginx, con HTTP (puerto 80) y la IP pública para las pruebas. Sin S3, sin Traefik, sin certificados.__

**TIPO DE DESPLIEGUE:** __Recreate__

Apaga el contenedor funcionando e inmediatamente después inicia el de la nueva versión. Genera downtime (unos segundos).
Aquí se aplica solo a los contenedores ``api`` y ``nginx``. La base de datos no se toca, así que no se pierden los datos.
Al final del documento explicamos por qué no elegimos Canary, Blue-Green ni Rolling.

## ANTES DE EMPEZAR: LAS ALERTAS Y LA FACTURACIÓN

Repite lo de la Clase 4 y 5, porque aquí también crearemos servicios que cobran:

* LAS ALERTAS NO DETIENEN LOS SERVICIOS, solo avisan.
* EL PROVEEDOR NO ES TU AMIGO, no hay una forma de negociar la deuda.
* DETEN LOS SERVICIOS, cuando sepas que ya no lo seguirás usando elimina todo con ``terraform destroy`` (paso 9).

## QUÉ NECESITAMOS TENER INSTALADO

* Todo lo de la Clase 5: **Terraform**, **AWS CLI** con ``aws configure`` hecho, cuenta de AWS con alertas, y **TailScale** instalado y conectado en tu computadora
* **Git** instalado (``git --version``)
* Una cuenta en **GitHub**

## PASOS PARA EL DESPLIEGUE

### 1) Subimos el proyecto a GitHub

En https://github.com/new creamos un repositorio (puede ser **privado**). No marcamos ninguna opción de README ni .gitignore.

Desde la carpeta raíz del proyecto (la que contiene ``Clase 1``, ``Clase 2``, ... y la carpeta ``.github``):

``git status``

Antes de subir, revisamos que **no aparezcan** ``node_modules``, ``.env``, ``terraform.tfstate`` ni ``terraform.tfvars``. Los ``.gitignore`` ya los excluyen. Si aparecen, no continúes.

``git add .``

``git commit -m "Clase 6: despliegue automático"``

``git branch -M main``

``git remote add origin https://github.com/TU-USUARIO/TU-REPO.git``

``git push -u origin main``

**Esperamos** ver al final:

```
Branch 'main' set up to track remote branch 'main' from 'origin'.
```

Al entrar al repositorio en GitHub debe verse la carpeta ``.github/workflows`` con el archivo ``deploy-clase6.yml``. En la pestaña **Actions** puede aparecer una ejecución fallida: es normal, todavía no configuramos los secretos ni existe el servidor.

**NOTA:** __GitHub solo lee los workflows si están en ``.github/workflows`` en la raíz del repositorio. En otra carpeta no los ve.__

### 2) Configuramos TailScale para que entren el servidor, GitHub y nosotros

Necesitamos tres cosas en https://login.tailscale.com/admin. **Se hacen en este orden.**

**2.1) Etiquetas (tags) y permisos SSH**

Entramos a **Access controls** y agregamos estos bloques dentro del JSON (si ya existe ``tagOwners`` o ``ssh``, agregamos las líneas dentro de los que ya hay):

```
"tagOwners": {
  "tag:servidor": ["autogroup:admin"],
  "tag:ci":       ["autogroup:admin"]
},

"ssh": [
  {
    "action": "accept",
    "src":    ["autogroup:member", "tag:ci"],
    "dst":    ["tag:servidor"],
    "users":  ["ubuntu"]
  }
]
```

Lo que dice: *tú (miembros de tu red) y GitHub (tag:ci) pueden entrar por SSH al servidor (tag:servidor), únicamente como el usuario ``ubuntu``.* Guardamos.

**NOTA:** __No borres la regla ``acls`` que ya viene por defecto. Es la que permite que las máquinas se vean entre sí.__

**2.2) Token para el servidor (reemplaza al de la Clase 5)**

* Entramos a https://login.tailscale.com/admin/settings/keys
* **Generate auth key**
* Marcamos **Ephemeral** y **Reusable**
* En **Tags** elegimos ``tag:servidor``
* Copiamos el ``tskey-auth-...``

Sin la etiqueta, el servidor nacería como una máquina sin ``tag:servidor`` y las reglas del paso anterior no le aplicarían.

**2.3) Credencial para GitHub (OAuth client)**

* Entramos a https://login.tailscale.com/admin/settings/oauth
* **Generate OAuth client**
* Permiso (scope): **Auth Keys** en **Write**, y en tags elegimos ``tag:ci``
* Copiamos el **Client ID** y el **Client secret**. El secret se muestra **una sola vez**.

**NOTA:** __Los nombres de los menús de TailScale pueden cambiar con el tiempo. Lo importante es: una etiqueta para el servidor, una etiqueta para GitHub, y una regla SSH que los conecte.__

### 3) Creamos la infraestructura

Igual que en la Clase 5, pero con ``clase6.tfvars``. Guardamos el token del servidor como variable de entorno **de tu consola** (el del paso 2.2):

PowerShell (Windows):

``$env:TF_VAR_tailscale_auth_key = "tskey-auth-XXXXXXXX"``

Bash (Linux / Mac / Git Bash):

``export TF_VAR_tailscale_auth_key="tskey-auth-XXXXXXXX"``

Luego, desde la carpeta ``Clase 6``:

``cd infra``

``terraform init``

**Esperamos:** ``Terraform has been successfully initialized!``

``terraform plan -var-file=envs/clase6.tfvars``

**Esperamos:** ``Plan: 3 to add, 0 to change, 0 to destroy.``

``terraform apply -var-file=envs/clase6.tfvars``

Escribimos ``yes``. **Esperamos:**

```
Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:

servicios = {
  "app" = {
    "instance_id" = "i-0abc123..."
    "ip_publica" = "203.0.113.50"
    "tailscale_hostname" = "clase6-app"
  }
}
```

(Tu IP será distinta. Anótala.) Esperamos un par de minutos a que el servidor ejecute su script de arranque y comprobamos:

``tailscale status``

Debe aparecer ``clase6-app`` en la lista. En https://login.tailscale.com/admin/machines debe verse con la etiqueta ``tag:servidor``. Entramos para comprobar:

``ssh ubuntu@clase6-app``

Dentro:

``docker --version``

``exit``

Si dice ``Permission denied`` o no conecta, revisa el paso 2.1. Si el ``docker`` no existe, el script de arranque aún no terminó: espera un minuto y repite.

### 4) Cargamos los secretos en GitHub

En tu repositorio: **Settings > Secrets and variables > Actions > New repository secret**. Creamos dos:

| Nombre | Valor |
|---|---|
| ``TS_OAUTH_CLIENT_ID`` | El Client ID del paso 2.3 |
| ``TS_OAUTH_SECRET`` | El Client secret del paso 2.3 |

**NOTA:** __Los secretos no se pueden volver a leer una vez guardados, solo reemplazar. Y nunca los escribas dentro del workflow.__

### 5) Revisamos el workflow

Está en ``.github/workflows/deploy-clase6.yml``. Tiene cuatro pasos (los detalles de por qué está armado así están al final):

1) **Descargar el código** (``actions/checkout``).
2) **Unirse a la red de TailScale**: GitHub crea una máquina temporal con ``tag:ci`` dentro de nuestra red.
3) **Copiar los archivos al servidor**: empaqueta la carpeta ``Clase 6`` y la envía por SSH a ``~/clase6``.
4) **Crear la imagen y recrear los contenedores** (``docker build`` + ``docker compose up -d --force-recreate api nginx``) y finalmente un **health check**: pregunta a ``/api/patentes`` hasta 15 veces. Si nunca responde, el despliegue se marca como fallido.

Las dos variables de arriba del archivo son las únicas que se tocan si cambia el nombre del servidor: ``SERVIDOR`` (debe ser igual al ``tailscale_hostname`` del paso 3) y ``DESTINO``.

### 6) Primer despliegue

En GitHub: pestaña **Actions > Deploy Clase 6 > Run workflow > Run workflow** (botón verde).

Entramos a la ejecución y abrimos el job ``deploy``. **Esperamos** los cuatro pasos con tilde verde. En el último ver:

```
Intento 1/15: aún no responde
Intento 2/15: aún no responde
OK: la API responde
```

(La cantidad de intentos varía: la base de datos tarda unos segundos en iniciar.)

Comprobamos desde tu computadora, con la IP del paso 3:

``curl http://203.0.113.50/api/patentes``

**Esperamos** ``[]``. Y abrimos ``http://203.0.113.50`` en el navegador: debe verse la web con el logo, la búsqueda y el formulario. Cargamos una patente.

### 7) Segundo despliegue: un cambio de verdad

Ahora sí lo automático. Editamos algo visible, por ejemplo un texto del archivo ``static/index.html`` de la carpeta ``Clase 6``.

Antes de subirlo, dejamos corriendo esto en **otra consola** para ver el downtime del tipo Recreate:

PowerShell:

``while ($true) { try { (Invoke-WebRequest http://203.0.113.50/api/patentes -UseBasicParsing -TimeoutSec 2).StatusCode } catch { "ERROR" }; Start-Sleep 1 }``

Bash:

``while true; do curl -s -o /dev/null -w "%{http_code}\n" --max-time 2 http://203.0.113.50/api/patentes; sleep 1; done``

Y en la consola principal:

``git add .``

``git commit -m "Cambio de texto en la web"``

``git push``

En **Actions** aparece solo una ejecución nueva. **Esperamos** que termine en verde, y en la consola de prueba ver una fila de ``200``, unos pocos ``ERROR`` (o ``502`` / ``000``) durante los segundos en que los contenedores se recrean, y luego ``200`` otra vez. **Eso es el downtime de Recreate.**

Refrescamos el navegador: el cambio ya está. Las patentes que cargamos siguen ahí, porque la base de datos no se recreó.

**NOTA:** __El despliegue solo se dispara si el cambio está dentro de la carpeta ``Clase 6``. Cambiar el README de otra clase no despliega nada.__

### 8) Rompemos algo a propósito (y volvemos atrás)

Para ver qué pasa cuando sale mal, en ``api/index.js`` escribimos una línea con un error, por ejemplo ``esto no es javascript``. Subimos:

``git add .``

``git commit -m "Prueba: cambio roto"``

``git push``

**Esperamos** que la ejecución termine en **rojo** en el paso del health check, mostrando los últimos logs de la api con el error. La web queda caída: Recreate no vuelve solo a la versión anterior.

Para recuperar, deshacemos el último commit y subimos:

``git revert HEAD --no-edit``

``git push``

**Esperamos** una nueva ejecución en verde y la web funcionando otra vez. Este es el **rollback**: volver a una versión anterior con un commit nuevo.

**NOTA:** __El health check no evita la caída, la detecta. Que el despliegue vuelva solo hacia atrás requiere otros tipos de despliegue (ver al final).__

### 9) Destruimos todo

DETEN LOS SERVICIOS. Desde ``Clase 6/infra`` (con la variable ``TF_VAR_tailscale_auth_key`` puesta en la consola):

``terraform destroy -var-file=envs/clase6.tfvars``

Escribimos ``yes``. **Esperamos:**

```
Destroy complete! Resources: 3 destroyed.
```

Comprobamos en la consola de AWS (EC2 > Instances y EC2 > Elastic IPs) que no quede nada.

Además:

* En GitHub, pestaña **Actions**, desactivamos el workflow (``...`` > **Disable workflow**). Si no, el próximo ``git push`` intentará desplegar en un servidor que ya no existe y fallará.
* En TailScale, revocamos el OAuth client del paso 2.3 si ya no lo usaremos.

## TAREA FINAL

Cada alumno deberá **tener su propio repositorio y su propio pipeline funcionando**. Para dar la tarea por realizada debes entregar:

1) Captura del repositorio en GitHub donde se vea la carpeta ``.github/workflows``.
2) Captura de TailScale (Machines) con ``clase6-app`` con su etiqueta ``tag:servidor``.
3) Captura del ``terraform apply`` terminado con ``Apply complete!`` y los outputs.
4) Captura de la ejecución de GitHub Actions en verde, con los cuatro pasos y el ``OK: la API responde``.
5) **Cambio propio:** modifica algo visible de la web, haz ``git push`` y entrega captura del navegador con el cambio ya publicado, junto a la captura de la ejecución que lo disparó.
6) Captura de la consola de prueba (paso 7) mostrando los ``200`` y los ``ERROR`` del downtime.
7) Captura de la ejecución **en rojo** del paso 8 y otra de la ejecución en verde posterior al ``git revert``.
8) Captura del ``terraform destroy`` terminado con ``Destroy complete!``.
9) Responde en una frase: ¿por qué en esta clase el servidor no tiene el puerto 22 abierto y aun así GitHub puede entrar?

**NOTA:** __Sin el punto 8 el servicio queda cobrando. Ese paso NO es opcional.__

---------------------------------------------------------------------

## CÓMO FUNCIONA POR DETRÁS

### El recorrido completo

```
 Tu computadora                GitHub                       AWS
 --------------                ------                       ---
 git push  ─────────────►  repositorio
                               │ (evento push en main)
                               ▼
                          Runner de Actions
                          (máquina temporal)
                               │ 1. se une a TailScale con tag:ci
                               │ 2. ssh por el túnel  ─────────►  EC2 (tag:servidor)
                               │                                   ├─ docker build
                               │                                   ├─ compose recrea api y nginx
                               │                                   └─ curl localhost (health check)
                               ▼
                          verde o rojo
```

El puerto 22 del Security Group **sigue cerrado** (ver Clase 5, HARDENING). GitHub no entra por internet: entra por la RED LAN virtual de TailScale, igual que nosotros.

### Por qué el workflow está armado así

* **``on: push`` con ``branches: [main]``**: solo lo que llega a main se despliega. Una rama de pruebas no toca el servidor.
* **``paths: ['Clase 6/**']``**: nuestro repositorio guarda varias clases. Sin este filtro, cualquier cambio en otra clase dispararía un despliegue.
* **``workflow_dispatch``**: permite lanzarlo a mano desde la pestaña Actions. Lo usamos en el primer despliegue.
* **``concurrency``**: si dos ``git push`` seguidos lanzan dos despliegues, el segundo espera al primero. Dos ``docker compose`` a la vez sobre el mismo servidor se pisarían.
* **``permissions: contents: read``**: el workflow solo puede leer el repositorio. Si alguien logra ejecutar código en él, no puede modificarlo.
* **``runs-on: ubuntu-latest``**: el **runner**. Es una máquina virtual que GitHub crea solo para esta ejecución y borra al terminar.

### Por qué TailScale con OAuth y etiquetas

* El runner es una máquina nueva en cada ejecución. Necesita entrar a la red cada vez. Con un **OAuth client**, la acción pide a TailScale una credencial efímera propia en cada ejecución. Un token fijo (auth key) vence a los 90 días como máximo y el despliegue dejaría de funcionar sin aviso.
* El runner se une con ``tag:ci`` y queda **efímero**: al terminar, desaparece de la lista de máquinas.
* Las **etiquetas** permiten dar permisos a *roles*, no a personas ni a máquinas sueltas: "``tag:ci`` puede entrar a ``tag:servidor`` como ``ubuntu``". Es ZERO TRUST NETWORK ACCESS: el runner solo puede lo que la regla le da, nada más.
* Por eso el token del servidor (paso 2.2) se genera con ``tag:servidor``: así nace con la etiqueta puesta, sin tocar el código de terraform.
* SSH lo autentica TailScale (por eso ``--ssh`` del script de arranque de la Clase 4/5). El runner no necesita una llave .pem ni guardar claves SSH en los secretos.

### Por qué esos comandos en el servidor

* **``tar ... | ssh ... tar``**: empaquetamos la carpeta y la enviamos por la misma conexión SSH en un solo paso. Excluimos ``node_modules`` (se instala dentro de la imagen), ``infra`` (la infraestructura se aplica desde tu computadora, no desde GitHub) y ``README.md``.
* **``StrictHostKeyChecking=accept-new``**: el runner es nuevo cada vez y nunca vio al servidor. Sin esta opción SSH preguntaría "are you sure you want to continue connecting?" y el workflow se quedaría colgado esperando.
* **``docker build -t api-node:v1 .``**: se construye en el servidor, con el mismo Dockerfile multi staged de las clases anteriores. Es la razón por la que no necesitamos un registro de imágenes (Docker Hub, ghcr) en esta clase.
* **``docker compose up -d --force-recreate api nginx``**: recrea solo esos dos contenedores.
  * ``api`` tiene que recrearse para usar la imagen nueva.
  * ``nginx`` también, porque sus archivos (``nginx.conf`` y ``static``) están montados como volumen desde el servidor y, al ser reemplazados, el contenedor viejo seguiría viendo la versión anterior hasta ser recreado.
  * ``db`` no se nombra: sigue corriendo y su volumen ``pg_data`` conserva los datos.
* **``docker image prune -f``**: cada build deja la imagen anterior sin nombre. Sin limpiarlas, 20 GB de disco se llenan en pocos despliegues.
* **Health check**: el paso termina en error si la API no responde. Sin eso, GitHub marcaría verde un despliegue que dejó la web caída (UI silenciosa: se rompe sin avisar).

### Por qué elegimos Recreate

| Tipo | Cómo funciona | Downtime | Qué necesita | ¿Lo usamos? |
|---|---|---|---|---|
| **Recreate** | Apaga la versión vieja, inicia la nueva | Sí (segundos) | Nada extra | **Sí** |
| **Rolling** | Actualiza de a una réplica por vez | No | Varias réplicas de la misma app | No |
| **Blue-Green** | Levanta la versión nueva (green) al lado de la vieja (blue) y cambia el tráfico de golpe | No | Doble de recursos y un balanceador que cambie el destino | No |
| **Canary** | Envía a la versión nueva solo un pequeño % del tráfico (ej: 10%) y lo va aumentando si no hay errores | No | Las dos versiones a la vez, un balanceador que reparta el %, y métricas para decidir | No |

Tenemos **un solo servidor**, una sola instancia de la API y nginx sin más lógica que servir y redirigir. Rolling no tiene réplicas entre las cuales rotar. Blue-Green y Canary requieren correr dos versiones a la vez y un componente que decida a cuál va cada petición. Es la complejidad que dejamos afuera a propósito.

Recreate, además, es el que ya usa terraform en nuestra plantilla (``user_data_replace_on_change``), así que las dos capas —infraestructura y aplicación— hablan el mismo idioma.

**Cuándo sí valdría la pena cambiar:** cuando el downtime de unos segundos moleste a los usuarios (Blue-Green) o cuando queramos probar una versión con poco riesgo antes de darla a todos (Canary).

### Lo que NO hace este pipeline

* No aplica terraform. La infraestructura se sigue creando desde tu computadora. Para que GitHub la aplicara, necesitaría credenciales de AWS y un lugar remoto donde guardar el ESTADO de terraform.
* No corre tests. Se podría agregar un paso antes de conectarse a TailScale.
* No vuelve atrás solo. Detecta la falla (health check) y para ahí. El rollback lo hacemos nosotros con ``git revert``.
* No usa registro de imágenes ni certificados. HTTP por el puerto 80.

## NOTA: LA PARTE DE PROGRAMACIÓN

La aplicación es exactamente la de la Clase 5 (web de patentes, API en node, postgres, nginx). Los únicos cambios fueron de nombres: los contenedores ahora se llaman ``clase6_pg_db`` y ``clase6_nginx``, y ``api/config/db.js`` tiene ese mismo host por defecto.

En la infraestructura, ``envs/clase5.tfvars`` pasó a ``envs/clase6.tfvars`` con ``proyecto = "clase6"``. Por eso la máquina en TailScale se llama ``clase6-app``.

## DEFINICIONES

**CI/CD** Integración y despliegue continuos. Cada cambio que subimos al repositorio dispara automáticamente pasos que lo prueban y/o lo despliegan.

**GITHUB ACTIONS** El servicio de GitHub que ejecuta esos pasos automáticos cuando ocurre algo en el repositorio (un push, un botón manual, etc.).

**WORKFLOW** El archivo ``.yml`` dentro de ``.github/workflows`` que describe cuándo se ejecuta la automatización y qué pasos hace.

**JOB / STEP** Un workflow tiene jobs (tareas) y cada job tiene steps (pasos que se ejecutan en orden). Si un paso falla, los siguientes no se ejecutan.

**RUNNER** La máquina virtual temporal donde GitHub ejecuta el job. Se crea para la ejecución y se elimina al terminar.

**SECRET (de GitHub)** Valor guardado cifrado en el repositorio, disponible para el workflow como ``${{ secrets.NOMBRE }}``. No se puede volver a leer, y GitHub oculta su valor en los logs.

**PUSH** Subir nuestros commits al repositorio remoto (``git push``).

**ROLLBACK** Volver a una versión anterior que funcionaba. Aquí lo hacemos con ``git revert`` + ``git push``.

**HEALTH CHECK** Pregunta automática a la aplicación para saber si está viva y respondiendo. Aquí, un ``curl`` a ``/api/patentes``.

**DOWNTIME** El tiempo en que el servicio no responde durante un despliegue.

**RECREATE** Tipo de despliegue donde se apaga lo anterior y se inicia la nueva versión. Genera downtime.

**ROLLING** Tipo de despliegue donde se reemplaza de a una réplica por vez, para que siempre quede alguna respondiendo. Requiere varias réplicas.

**BLUE-GREEN** Tipo de despliegue con dos entornos idénticos: el actual (blue) y el nuevo (green). Cuando el nuevo está listo, el tráfico se cambia de uno a otro de golpe. Permite volver atrás cambiando el tráfico de vuelta.

**CANARY** Tipo de despliegue donde la versión nueva recibe solo un pequeño porcentaje del tráfico. Si no hay errores, se aumenta hasta el 100%. Recibe el nombre del canario que se llevaba a las minas de carbón para avisar del peligro antes que los mineros.

**TAILSCALE** Red segura que enlaza computadoras como una RED LAN virtual, usando el protocolo WireGuard. Ver Clase 4.

**TAG (de TailScale)** Etiqueta que se le pone a una máquina para darle un rol (``tag:servidor``, ``tag:ci``). Las reglas de acceso se escriben para etiquetas.

**ACL (Access controls)** Las reglas de TailScale que definen quién puede conectarse a qué. Están escritas en un JSON en el panel de administración.

**OAUTH CLIENT** Credencial (Client ID + Client secret) que permite a una aplicación pedir a TailScale permisos acotados, sin usar un usuario ni un token que venza.

**EFÍMERO (ephemeral)** Máquina que se elimina sola de la red de TailScale cuando se desconecta.

**ZERO TRUST NETWORK ACCESS** No confiar en nadie por defecto: solo entra quien esté autenticado dentro de la red de TailScale y tenga una regla que lo permita.

**HARDENING** Endurecer la seguridad de un sistema cerrando todo lo que no sea necesario. Aquí: puerto 22 cerrado, y GitHub entrando solo por el túnel.

**SSH** Protocolo para controlar un servidor remoto desde la consola. Ver Clase 3.

**TAR** Programa que junta muchos archivos en uno solo (y lo comprime). Lo usamos para enviar la carpeta de una sola vez.

**DOCKER COMPOSE (--force-recreate)** Opción que obliga a recrear los contenedores indicados aunque su configuración no haya cambiado.

**IMAGEN / CONTENEDOR** La imagen es la plantilla con la app, el contenedor es esa imagen en ejecución. Ver Clase 1 y 2.

**ESTADO (terraform.tfstate)** Archivo donde terraform anota qué creó. **No se borra, ni se sube al repositorio.** Ver Clase 5.
