import { exec } from 'child_process'
import { promisify } from 'util'

export class Proxmox {
    async saveVM() {
        const vmList: string[] = process.env.VM_ID_LIST!.split(',')

        for (let i = 0; i < vmList.length; i++) {
            const vmId = vmList[i]
            console.log('Snapshot of vm ' + vmId)

            await this.createSnapshot(vmId)

            await this.clearExtraSnapshot(vmId, Number(process.env.MAX_SNAPSHOT_NB))
        }
    }

    async createSnapshot(vmId: string) {
        const command: string =
            process.env.QM_PATH + ' snapshot ' + vmId + ' "AutoSave' + this.getFormattedDateTime() + '"'

        await this.executeCommandWithLogAtEnd(command)
    }

    getFormattedDateTime(): string {
        const now: Date = new Date()

        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')

        const hours = String(now.getHours()).padStart(2, '0')
        const minutes = String(now.getMinutes()).padStart(2, '0')
        const seconds = String(now.getSeconds()).padStart(2, '0')

        return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`
    }

    executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
        console.log('Executing : ' + command)

        const execPromise = promisify(exec)

        return execPromise(command)
    }

    async executeCommandWithLogAtEnd(command: string): Promise<string> {
        const { stdout } = await this.executeCommand(command)

        if (stdout) {
            console.log(`Output: ${stdout.trim()}`)
        }

        return stdout
    }

    async getListSnapshot(vmId: string): Promise<string[]> {
        const command: string = process.env.QM_PATH + ' listsnapshot ' + vmId

        const output = await this.executeCommandWithLogAtEnd(command)

        const outputByLine: string[] = output.split('\n')

        const snapshotNameList: string[] = []

        for (let i = 0; i < outputByLine.length; i++) {
            // Remove the 3 last lines as there are not snapshots
            if (i < outputByLine.length - 2) {
                const line = outputByLine[i].trim()

                // Split the col by spaces
                const colOfLine: string[] = line.split(/\s+/)

                snapshotNameList.push(colOfLine[1])
            }
        }

        return snapshotNameList
    }

    async clearExtraSnapshot(vmId: string, maxSnapshotNb: number) {
        const snapshotNameList = await this.getListSnapshot(vmId)

        // Loop on the first entry who exceed the max snapshot nb
        for (let i = 0; i < snapshotNameList.length - maxSnapshotNb; i++) {
            const snapshotName: string = snapshotNameList[i]

            this.clearSnapshot(vmId, snapshotName)
        }
    }

    async clearSnapshot(vmId: string, snapshotName: string) {
        const command = process.env.QM_PATH + ' delsnapshot ' + vmId + ' ' + snapshotName
        await this.executeCommandWithLogAtEnd(command)
    }
}
