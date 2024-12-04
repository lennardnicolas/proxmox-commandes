import { Proxmox } from '../proxmox.js'
import dotenv from 'dotenv'

dotenv.config()

const proxmox: Proxmox = new Proxmox()
await proxmox.saveVM()
