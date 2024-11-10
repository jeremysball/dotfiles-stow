#autoload

#TODO: Figure out navigation
#TODO: A better way than the while loop?
#TODO: How to keep track of error codes for nav?
#TODO: Integrate with the Ctrl+T mapping that you already have, that would make it PERFECT

declare -A directories
declare -A files

alias fzf="fzf --cycle --preview 'cat {}' --ansi --height=40%"

TRUE="true"
FALSE="false"

home="/home/jeremy"
config="$home/.config"
portageDir="/etc/portage"

directories=(
	".zsh/functions/" "$home/.zsh/functions/" 
	".config/nvim/" "$home/.config/nvim/"
	
	"portage/package.use/" "$portageDir/package.use/"
	"portage/package.license/" "$portageDir/package.license/"
	"portage/package.accept_keywords/" "$portageDir/package.accept_keywords/"
	"portage/package.mask" "$portageDir/package.license"
	"portage/" "$portageDir"
	"config" "$config"
)

files=(
	".zshrc" "$home/.zshrc"
	"alacritty.yml" "$config/alacritty/alacritty.yml"
	"i3/config" "$config/i3/config" 
	"picom/picom.conf" "$config/picom/picom.conf"
	"portage/make.conf" "$portageDir/make.conf"
)

function fzfOnDir() {
	
#	echo "N selected in fzfOnDir: $selected \n"
#	echo "N inside fzfOnDir $directories[$selected] \n"
	echo $(find $1 | tail -n +2 | fzf)
}

function isOurDir() {
	[[ -n ${directories[$1]} ]] 
	return
}

function isOurFile() {
	[[ -n ${files[$1]} ]]
	return
}

function edit() {
	selected=$( echo "$(echo ${(k)files} | awk ' { print "\033[38;2;129;241;170m"$0"\033[0m"; } ')
				Dirs:
				$(echo ${(k)directories} | awk ' { print "\033[38;2;77;51;153m"$0"\033[0m"; } ')" |  
				tr " " "\n" | 
				fzf)
	
	while true; do
		if [[ $selected = "" ]]; then break; fi
	
		targetPath=""
		echo $(isOurDir "$selected")
		if (isOurDir "${selected}"); then
			echo 1	
			targetPath=${directories[$selected]}
		elif (isOurFile "${selected}"); then  
			echo 2
			selected=${files[$selected]}
			break 
		elif [[ -d $selected ]]; then
			echo 3
			targetPath=$selected
		# We've reached a file 
		elif [[ -f $selected ]]; then 
			# Set selected since we won't be back 
			echo 4
			selected=$selected
			break
		fi
		selected=$(fzfOnDir $targetPath)	
		sleep .5
	done
	echo $selected
	$EDITOR $selected 
}

edit
