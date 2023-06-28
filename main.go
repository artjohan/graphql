package main

import (
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strconv"
)

func main() {
	fileServer := http.FileServer(http.Dir("./static/"))
	http.Handle("/static/", http.StripPrefix("/static", fileServer))
	http.HandleFunc("/", HomePageHandler)
	http.HandleFunc("/graphql", GraphQLHandler)
	portNr := getPortNr()
	fmt.Printf("Started server at http://localhost:%v\n", portNr)
	// runs server
	if err := http.ListenAndServe(":"+strconv.Itoa(portNr), nil); err != nil {
		log.Fatal(err)
	}
}

func HomePageHandler(w http.ResponseWriter, r *http.Request) {
	temp, err := template.ParseFiles("index.html")
	if err != nil {
		http.Redirect(w, r, "/", http.StatusInternalServerError)
		return
	}

	if e := temp.Execute(w, nil); e != nil {
		http.Redirect(w, r, "/", http.StatusInternalServerError)
	}
}

func GraphQLHandler(w http.ResponseWriter, r *http.Request) {
	temp, err := template.ParseFiles("graphql.html")
	if err != nil {
		http.Redirect(w, r, "/", http.StatusInternalServerError)
		return
	}

	if e := temp.Execute(w, nil); e != nil {
		http.Redirect(w, r, "/", http.StatusInternalServerError)
	}
}

// checks if inputted port nr exists/is correct
func getPortNr() int {
	if len(os.Args) == 2 {
		n, e := strconv.Atoi(os.Args[1])
		if e == nil && (n > 1023 && n < 65536) {
			return n
		}
	}
	return 8080
}
